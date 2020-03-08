
// import { asyncForEach, waitFor } from './util';

const config = require('./config/config');
const app = require('./config/express');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { Wechaty } = require('wechaty');
const Sentry = require('@sentry/node');
const util = require('./util');

const webot = new Wechaty();
Sentry.init({ dsn: 'https://d72c3c5d33f64bd7a17d79feee82073d@sentry.io/3606504' });

io.on('connection', (client) => {
  client.on('getqrcode', () => {
    if (webot.logonoff()) {
      io.emit('login', webot.userSelf());
    } else {
      webot
        .on('scan', (qrcode, status) => {
          io.emit('qrcode', { status, qrcode: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}` });
        })
        .on('login', async (user) => {
          io.emit('login', user);
          try {
            const existMyAtatar = await util.isFileExist(`./static/${user.name()}-avatar.jpg`);
            if (!existMyAtatar) {
              await saveAvatar(user);
            }
          } catch (e) {
            console.log(e);
          }
        })
        .on('message', async (msg) => {
          const type = msg.type();
          let text = msg.text();
          if (type === 6) {
            const fileBox = await msg.toFileBox();
            const fileName = fileBox.name;
            fileBox.toFile(`./static/pic/${fileName}`);
            text = fileName;
          }
          const message = {
            from: msg.from(),
            to: msg.to(),
            text,
            room: msg.room(),
            type,
            self: msg.self(),
            age: msg.age()
          };
          io.emit('message', message);
        })
        .start();
    }
  });

  client.on('getavatar', async (data) => {
    console.log('getavatar');
    const { name, message } = data;
    const contact = await webot.Contact.find({ name });
    const _name = contact ? contact.name() : null;
    if (!_name) {
      return;
    }
    try {
      const existMyAtatar = util.isFileExist(`./static/${_name}-avatar.jpg`);
      if (!existMyAtatar) {
        await saveAvatar(contact);
        if (message) {
          io.emit('messageavatar', name);
        } else {
          io.emit('avatar', name);
        }
      }
    } catch (e) {
      console.log(e);
    }
  });

  client.on('getcontacts', async () => {
    const contactList = await webot.Contact.findAll();
    const contacts = contactList.filter(ele => ele.payload.type === 1);
    io.emit('contacts', contacts);
  });

  client.on('sendmessage', async (data) => {
    if (data.room) {
      const room = await webot.Room.find({ topic: data.name });
      if (room) {
        await room.say(data.message);
      }
    } else {
      const contact = await webot.Contact.find({ name: data.name });
      if (contact) {
        await contact.say(data.message);
      }
    }
  });

  client.on('checklogin', () => {
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

async function saveAvatar(contact) {
  console.log('contact', contact);
  const file = await contact.avatar();
  console.log('file', file);
  const name = file.name;
  await file.toFile(`./static/${name}`, true);
  console.log(`Save avatar: with avatar file: ${name}`);
}

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  // listen on port config.port
  server.listen(config.port, () => {
    console.info(`server started on port ${config.port} (${config.env})`); // eslint-disable-line no-console
  });
}

module.exports = app;
