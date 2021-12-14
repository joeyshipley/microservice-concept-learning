const express = require('express');
const http = require('http');
const mongodb = require('mongodb');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

const app = express();

function main() {
  return mongodb.MongoClient
    .connect(DBHOST)
    .then((client) => {
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
              produceEventForVideoViewed(videoId);
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
    });
}

function produceEventForVideoViewed(videoId) {
    const options = {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
    };
    const viewedOn = dayjs.utc().format();
    const requestBody = {
      videoId,
      viewedOn,
    };
    const req = http.request("http://stream-history/viewed", options);
    req.on("close", () => {});
    req.on("error", (error) => {
      console.log('Error sending video viewed event to history.');
      console.log(error);
    });
    req.write(JSON.stringify(requestBody));
    req.end();
}

main()
  .catch((err) => {
    console.error(`Video-Streaming :: Service FAILURE (PORT ${ PORT })`);
    console.error(err);
  });
