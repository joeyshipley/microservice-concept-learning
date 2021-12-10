const express = require('express');
const mongodb = require('mongodb');
const dayjs = require('dayjs');

const PORT = process.env.PORT;

function setupHandlers(app) {
  app.get('/', (req, res) => { res.send(`TEST Stream-History IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss')  }`); });
}

function startHttpServer() {
  return new Promise((resolve) => {
    const app = express();
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
