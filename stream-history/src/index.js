const express = require('express');
const bodyParser = require('body-parser')
const mongodb = require('mongodb');
const amqp = require('amqplib');
const dayjs = require('dayjs');

const PORT = process.env.PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

const app = express();

function main() {
  return mongodb.MongoClient
    .connect(DBHOST)
    .then((client) => {
      return connectRabbit()
        .then((messageChannel) => {
          const db = client.db(DBNAME);
          const videosViewedCollection = db.collection('videos-viewed');

          function consumeVideoViewedMessage(msg) {
            const data = JSON.parse(msg.content.toString());
            console.log(` --- (Stream-History) HISTORY EVENT --- VIEWED <------------------------------------------------ `);
            console.log(data);
            videosViewedCollection.insertOne({ videoId: data.videoId, viewedOn: data.viewedOn })
              .then(() => {
                messageChannel.ack(msg);
                console.log(`Stream-History :: Video Watched ID=${ data.videoId }`);
              })
              .catch((err) => {
                console.error(`Stream-History :: unable to add video watched for ID=${ videoId }`);
                console.error(err);
              });
          }

          app.use(bodyParser.json());

          app.get('/', (req, res) => { res.send(`TEST Stream-History IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss')  }`); });

          // app.post('/viewed', (req, res) => {
          //   const videoId = req.body.videoId;
          //   const viewedOn = req.body.viewedOn;
          //   console.log(` ---------- VIDEO VIEWED! [ ${ viewedOn } ] ---------- `);
          //   videosViewedCollection.insertOne({ videoId: videoId, viewedOn: viewedOn })
          //     .then(() => {
          //       console.log(`Stream-History :: Video Watched ID=${ videoId }`);
          //       res.sendStatus(200);
          //     })
          //     .catch((err) => {
          //       console.error(`Stream-History :: unable to add video watched for ID=${ videoId }`);
          //       console.error(err);
          //       res.sendStatus(500);
          //     });
          // });

          app.listen(PORT, () => {
            console.log(`Stream-History :: Service ONLINE (PORT ${ PORT })`);
          });

          return messageChannel.assertExchange('video-viewed', 'fanout')
            .then(() => {
              return messageChannel.assertQueue('', { exclusive: true });
            })
            .then((response) => {
              const queueName = response.queue;
              return messageChannel.bindQueue(queueName, 'video-viewed', '')
                .then(() => {
                  return messageChannel.consume(queueName, consumeVideoViewedMessage);
                });
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
    .then((messagingConnection) => messagingConnection.createChannel());
}

function startService() {
  return main()
    .catch((err) => {
      console.error(`Stream-History :: Service FAILURE (PORT ${ PORT })`);
      console.error(err);
      const restartIn = 5000;
      console.log(`Stream-History :: Queuing Restart (${ restartIn })`);
      setTimeout(startService, restartIn, 'restart-service');
    });
}

startService();
