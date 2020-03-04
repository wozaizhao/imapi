const express = require('express');
const validate = require('express-validation');
const paramValidation = require('../../config/param-validation');
const wechatCtrl = require('./wechat.controller');

const router = express.Router(); // eslint-disable-line new-cap

/** POST /api/auth/login - */
router.route('/login')
  .post(validate(paramValidation.login), wechatCtrl.login);

module.exports = router;
