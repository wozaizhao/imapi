const express = require('express');
const wechatRoutes = require('./server/wechat/wechat.route');

const router = express.Router(); // eslint-disable-line new-cap

// TODO: use glob to match *.route files

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) =>
  res.send('OK')
);

// mount auth routes at /auth
router.use('/wechat', wechatRoutes);

module.exports = router;
