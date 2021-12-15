const express = require('express');
const http = require('http');
const mongodb = require('mongodb');
const amqp = require('amqplib');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

console.log(` --> ${ RABBIT } <-------------------------------------------------`);

const app = express();

function main() {
  return mongodb.MongoClient
    .connect(DBHOST)
    .then((client) => {
      return connectRabbit()
        .then((messageChannel) => {
          const db = client.db(DBNAME);
          const videosCollection = db.collection('videos');

          app.get('/', (req, res) => { res.send(`Video-Streaming IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss') }`); });

          app.get('/video', (req, res) => {
            console.log(' ------------------ STREAM-IT > View View REQUEST! ------------------ ');
            const videoId = new mongodb.ObjectID(req.query.id);
            videosCollection
              .findOne({ _id: videoId })
              .then((videoRecord) => {
                if(!videoRecord) {
                  console.log(`Video (${ videoId }) not found in DB.`);
                  res.sendStatus(404);
                  return;
                }

                // NOTE: this style of passthrough request is causing Express
                // to not send back the correct response type and ultimately
                // ends up having the browser hit this endpoint twice.
                const forwardRequest = http.request({
                    host: VIDEO_STORAGE_HOST,
                    port: VIDEO_STORAGE_PORT,
                    path: `/video?path=${ videoRecord.videoPath }`,
                    method: 'GET',
                    headers: req.headers
                }, (forwardResponse) => {
                  res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
                  forwardResponse.pipe(res);
                  produceEventForVideoViewed(messageChannel, videoId);
                });

                req.pipe(forwardRequest);
              })
              .catch((err) => {
                console.error("Database query failure.");
                console.error(err);
                res.sendStatus(500);
              });

            // produceEventForVideoViewed(videoId);
            // res.send({ message: `Video Requested: ID ${ videoId }` });
          });

          app.listen(PORT, () => {
            console.log(`Video-Streaming :: Service ONLINE (PORT ${ PORT })`);
          });
        })
        .catch((err) => {
          console.error("RabbitMQ connection failure.");
          console.error(err);
          throw err;
        });
    })
    .catch((err) => {
      console.error("MongoDB connection failure.");
      console.error(err);
      throw err;
    });
}

function connectRabbit() {
  return amqp
    .connect(RABBIT)
    .then((connection) => {
      return connection.createChannel()
        .then((messageChannel) => {
          return messageChannel.assertExchange('video-viewed', 'fanout')
            .then(() => {
              return messageChannel;
            });
        });
    });
}

function produceEventForVideoViewed(messageChannel, videoId) {
  const data = {
    videoId,
    viewedOn: dayjs.utc().format(),
  };
  messageChannel.publish('video-viewed', '', Buffer.from(JSON.stringify(data)));
}

function startService() {
  return main()
    .catch((err) => {
      console.error(`Video-Streaming :: Service FAILURE (PORT ${ PORT })`);
      console.error(err);
      const restartIn = 5000;
      console.log(`Video-Streaming :: Queuing Restart (${ restartIn })`);
      setTimeout(startService, restartIn, 'restart-service');
    });
}

startService();
