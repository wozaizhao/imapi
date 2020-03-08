const fs = require('fs');

/**
 * async forEach
 * @param {*} array array
 * @param {*} callback callback
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
}
/**
 * waitFor
 * @param {*} ms millisecond
 */
const waitFor = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * file exist or not
 * @param {*} path
 */
function isFileExist(path) {
  console.log(path);
  try {
    if (fs.existsSync(path)) {
      return true;
    }
  } catch (err) {
    console.error(err);
  }
  return false;
  // return new Promise((resolve, reject) => {
  //   fs.exists(path, (res) => {
  //     console.log('fileExist: ', res);
  //     if (res) {
  //       resolve(res);
  //     } else {
  //       reject(res);
  //     }
  //   });
  // });
}

module.exports = {
  asyncForEach,
  waitFor,
  isFileExist
};
