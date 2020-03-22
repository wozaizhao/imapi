
const md5 = require('md5');
const req = require('./superagent');

const appid = '20200322000402549';
const key = '6H1q9wB16_CVcusdmAfE';
const from = 'zh';
const to = 'en';

/**
 * 百度翻译
 * @param {String} query - 要翻译的词或句
 */
async function tran(query) {
  const salt = (new Date()).getTime();
  const str = appid + query + salt + key;
  const sign = md5(str);
  const option = {
    method: 'GET',
    url: 'http://api.fanyi.baidu.com/api/trans/vip/translate',
    params: {
      q: query,
      appid,
      salt,
      from,
      to,
      sign
    }
  };
  const res = await req(option);
  console.log('tran', res.body);
  return res.body.trans_result[0].dst;
  // $.ajax({
  //   url: 'http://api.fanyi.baidu.com/api/trans/vip/translate',
  //   type: 'get',
  //   dataType: 'jsonp',
  //   data: {
  //     q: query,
  //     appid,
  //     salt,
  //     from,
  //     to,
  //     sign
  //   },
  //   success(data) {
  //     console.log(data);
  //   }
  // });
}

module.exports = tran;
