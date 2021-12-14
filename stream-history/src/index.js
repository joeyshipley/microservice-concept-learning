const express = require('express');
const bodyParser = require('body-parser')
const mongodb = require('mongodb');
const dayjs = require('dayjs');

const PORT = process.env.PORT;
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

function setupHandlers(app) {
  return mongodb.MongoClient
    .connect(DBHOST)
    .then((client) => {
      const db = client.db(DBNAME);
      const videosViewedCollection = db.collection('videos-viewed');

      app.get('/', (req, res) => { res.send(`TEST Stream-History IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss')  }`); });

      app.post('/viewed', (req, res) => {
        const videoId = req.body.videoId;
        const viewedOn = req.body.viewedOn;
        console.log(` ---------- VIDEO VIEWED! [ ${ viewedOn } ] ---------- `);
        videosViewedCollection.insertOne({ videoId: videoId, viewedOn: viewedOn })
          .then(() => {
            console.log(`Stream-History :: Video Watched ID=${ videoId }`);
            res.sendStatus(200);
          })
          .catch((err) => {
            console.error(`Stream-History :: unable to add video watched for ID=${ videoId }`);
            console.error(err);
            res.sendStatus(500);
          });
      });
    });
}

function startHttpServer() {
  return new Promise((resolve) => {
    const app = express();

    app.use(bodyParser.json());
    setupHandlers(app);

    app.listen(PORT, () => { resolve(); });
  });
}

startHttpServer()
  .then(() => {
    console.log(`Stream-History :: Service ONLINE (PORT ${ PORT })`);
  })
  .catch((err) => {
    console.error(`Stream-History :: Service FAILURE (PORT ${ PORT })`);
    console.error(err);
  });
