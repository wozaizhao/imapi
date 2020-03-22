const req = require('./superagent');

/**
 * 解析响应数据
 * @param {*} content 内容
 */
function parseBody(content) {
  if (!content) return;
  return JSON.parse(content.text);
}

/**
 * 图灵智能聊天机器人
 * @param {*} word 内容
 * @param {*} id id
 */
async function tuling(word) {
  try {
    const uniqueId = (new Date()).getTime();
    const data = {
      reqType: 0,
      perception: {
        inputText: {
          text: word
        }
      },
      userInfo: {
        apiKey: '6ecb3513186b4619ae86347000db0f55',
        userId: uniqueId
      }
    };
    const option = {
      method: 'POST',
      url: 'http://openapi.tuling123.com/openapi/api/v2',
      params: data,
      contentType: 'application/json;charset=UTF-8'
    };
    const res = await req(option);
    const content = parseBody(res);
    const reply = content.results[0].values.text;
    return reply;
  } catch (error) {
    console.log('图灵聊天机器人请求失败：', error);
  }
}

module.exports = tuling;
