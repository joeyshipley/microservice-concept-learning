const express = require('express');
const amqp = require('amqplib');
const dayjs = require('dayjs');

const PORT = process.env.PORT;
const RABBIT = process.env.RABBIT;

const app = express();

function main() {
  return connectRabbit()
    .then((messageChannel) => {
      function consumeVideoViewedMessage(msg) {
        const data = JSON.parse(msg.content.toString());
        console.log(` --- (Recommendations) HISTORY EVENT --- VIEWED <------------------------------------------------ `);
        console.log('Oh you they have watched so much! I have so many mind bending recomendations for them... I am afraid they will not like them... I will keep to myself for now. Sigh.');
        console.log(data);
        messageChannel.ack(msg);
      }

      app.get('/', (req, res) => { res.send(`TEST Recommendations IS GO! ${ dayjs().format('YYYY-MM-DD HH:mm:ss')  }`); });

      app.listen(PORT, () => {
        console.log(`Recommendations :: Service ONLINE (PORT ${ PORT })`);
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
}

function connectRabbit() {
  return amqp
    .connect(RABBIT)
    .then((messagingConnection) => messagingConnection.createChannel());
}

function startService() {
  return main()
    .catch((err) => {
      console.error(`Recommendations :: Service FAILURE (PORT ${ PORT })`);
      console.error(err);
      const restartIn = 5000;
      console.log(`Recommendations :: Queuing Restart (${ restartIn })`);
      setTimeout(startService, restartIn, 'restart-service');
    });
}

startService();
