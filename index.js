
// config should be imported before importing any other file
const config = require('./config/config');
const app = require('./config/express');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { Wechaty } = require('wechaty'); // import { Wechaty } from 'wechaty'
const webot = new Wechaty();

const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://d72c3c5d33f64bd7a17d79feee82073d@sentry.io/3606504' });

io.on('connection', (client) => {
  client.on('getqrcode', () => {

    if (webot.logonoff()) {
      io.emit('login', webot.userSelf());
    } else {
      webot.on('scan', (qrcode, status) => {
        console.log(`Scan QR Code to login: ${status}\nhttps://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`);
        io.emit('qrcode', { status, qrcode: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}` });
      })
      .on('login', (user) => {
        console.log(`User ${user} logined`);
        io.emit('login', user);
        setTimeout( async () => {
          const contactList = await webot.Contact.findAll()
          io.emit('contacts', contactList)
        }, 2000);
      })
      .on('message', async (msg) => {
        const from = msg.from();
        const to = msg.to();
        const text = msg.text();
        const room = msg.room();
        const type = msg.type();
        const self = msg.self();
        const age =  msg.age();
        let message = {
          from,
          to,
          text,
          room,
          type,
          self,
          age
        }
        // if (room) {
        //   const topic = await room.topic()
        //   message.room.topic = topic;
        // }
        io.emit('message', message);
      })
      .start();
    }
      
  });
  client.on('sendmessage', async (data) => {
    console.log('sendmessage', data);
    if (data.room) {
      const room = await webot.Room.find({topic: data.name})
      if (room) {
        await room.say(data.message)
      }
    } else {
      const contact = await webot.Contact.find({name: data.name})
      if (contact) {
        await contact.say(data.message)
      }
    }
    // io.emit('event', 'an event sent to all connected clients');
  });
  client.on('checklogin', (data) => {
    if (webot.logonoff()) {
      io.emit('login', webot.userSelf());
    } else {
      io.emit('login', null);
    }
  });
  client.on('logout', () => {
    Wechaty.instance().logout();
    // Wechaty.instance().stop();
  });
  client.on('disconnect', () => {

  });
});

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  // listen on port config.port
  server.listen(config.port, () => {
    console.info(`server started on port ${config.port} (${config.env})`); // eslint-disable-line no-console
  });
}

module.exports = app;
