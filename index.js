
const config = require('./config/config');
const app = require('./config/express');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { Wechaty, FileBox } = require('wechaty');
const tran = require('./api/tran');
const tuling = require('./api/tuling');

const fs = require('fs');
const Sentry = require('@sentry/node');
const util = require('./util');

const webot = new Wechaty();
Sentry.init({ dsn: 'https://d72c3c5d33f64bd7a17d79feee82073d@sentry.io/3606504' });

/**
 * 延时函数
 * @param {*} ms 毫秒
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let running = false;
const files = {};
const struct = {
  room: false,
  contactname: null,
  name: null,
  type: null,
  size: 0,
  data: [],
  slice: 0
};

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
          const mentionSelf = await msg.mentionSelf();
          console.log('mentionSelf', mentionSelf);
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
          // 在特定会话中，非我说了一句中文，自动翻译并回复
          const contact = msg.from(); // 发消息人
          const contactName = contact.name();
          const room = msg.room();
          let roomName = '';
          if (room) {
            roomName = await room.topic();
          }
          const isFrog = roomName === '温水煮青蛙';
          const isPenney = contactName === 'Penney';
          if (isPenney || isFrog) {
            if (/[\u4e00-\u9fa5]/.test(text)) {
              if (mentionSelf) {
                const content = text.replace(/@[^,，：:\s@]+/g, '').trim();
                try {
                  const reply = await tuling(content);
                  console.log('reply', reply);
                  if (reply !== '' && reply !== '请求次数超限制!') {
                    await delay(1000);
                    if (room) {
                      room.say(reply);
                    } else {
                      contact.say(reply);
                    }
                  }
                } catch (e) {
                  console.log(e);
                }
              } else {
                try {
                  const reply = await tran(text);
                  console.log('reply', reply);
                  if (reply !== '') {
                    await delay(1000);
                    if (room) {
                      room.say(reply);
                    } else {
                      contact.say(reply);
                    }
                  }
                } catch (e) {
                  console.log(e);
                }
              }
            }
          }
        });
      if (!running) {
        webot
        .start()
        .then(() => {
          console.log('开始登陆微信');
          running = true;
        })
        .catch(async (e) => {
          console.log(`初始化失败: ${e}.`);
          await webot.stop();
          running = false;
          process.exit(1);
        });
      }
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

  client.on('upload', (data) => {
    if (!files[data.name]) {
      files[data.name] = Object.assign({}, struct, data);
      files[data.name].data = [];
    }
    // convert the ArrayBuffer to Buffer
    const content = new Buffer(new Uint8Array(data.data));
    // save the data
    files[data.name].data.push(content);
    files[data.name].slice = files[data.name].slice += 1;
    console.log('on upload slice: ', files[data.name].slice);
    if (files[data.name].slice * 100000 >= files[data.name].size) {
      console.log('upload end');
      const fileBuffer = Buffer.concat(files[data.name].data);
      fs.writeFile(`./static/upload/${data.name}`, fileBuffer, async (err) => {
        if (err) {
          console.log('upload err');
        } else {
          const fileBox = FileBox.fromFile(`./static/upload/${data.name}`);
          if (files[data.name].room) {
            const room = await webot.Room.find({ topic: files[data.name].contactname });
            if (room) {
              await room.say(fileBox);
              delete files[data.name];
            }
          } else {
            const contact = await webot.Contact.find({ name: files[data.name].contactname });
            if (contact) {
              await contact.say(fileBox);
              delete files[data.name];
            }
          }
        }
      });
    } else {
      io.emit('requestslice', { currentSlice: files[data.name].slice });
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
