const express = require('express');
const http = require('http');
const mongodb = require('mongodb');
const dayjs = require('dayjs');

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
        const videoId = new mongodb.ObjectID(req.query.id);
        videosCollection
          .findOne({ _id: videoId })
          .then((videoRecord) => {
            if(!videoRecord) {
              console.log(`Video (${ videoId }) not found in DB.`);
              res.sendStatus(404);
              return;
            }

            const forwardRequest = http.request({
                host: VIDEO_STORAGE_HOST,
                port: VIDEO_STORAGE_PORT,
                path: `/video?path=${ videoRecord.videoPath }`,
                method: 'GET',
                headers: req.headers
            }, (forwardResponse) => {
              res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
              // TODO: fire and forget history viewed for this video id.
              forwardResponse.pipe(res);
            });

            req.pipe(forwardRequest);
          })
          .catch((err) => {
            console.error("Database query failure.");
            console.error(err);
            res.sendStatus(500);
          });

      });

      app.listen(PORT, () => {
        console.log(`Video-Streaming :: Service ONLINE (PORT ${ PORT })`);
      });
    });
}

main()
  .catch((err) => {
    console.error(`Video-Streaming :: Service FAILURE (PORT ${ PORT })`);
    console.error(err);
  });
