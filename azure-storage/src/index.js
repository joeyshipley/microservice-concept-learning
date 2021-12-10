const fs = require('fs');
const express = require('express');
const azure = require('azure-storage');
const dayjs = require('dayjs');

const PORT = process.env.PORT;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;

const app = express();

const createBlobService = () => {
  return azure.createBlobService(STORAGE_ACCOUNT_NAME, STORAGE_ACCESS_KEY);
}

app.get('/', (req, res) => {
    res.send(`Azure-Storage IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss') }`);
});

app.get('/video', (req, res) => {
  const videoPath = req.query.path;
  const blobService = createBlobService();
  const containerName = 'videos';

  blobService.getBlobProperties(containerName, videoPath, (err, properties) => {
    if(err) {
      console.log(error);
      console.error('Error occurred fetching the video properties.');
      res.sendStatus(500);
      return;
    }

    res.writeHead(200, {
      "Content-Length": properties.contentLength,
      "Content-Type": 'video/mp4',
    });

    blobService.getBlobToStream(containerName, videoPath, res, (err) => {
      if(err) {
        console.log(err);
        console.error('Error occurred serving the video.');
        res.sendStatus(500);
        return;
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Azure-Storage :: Service ONLINE (PORT ${ PORT })`);
});
