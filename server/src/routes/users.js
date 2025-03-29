const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({ 
    message: 'Users API endpoint',
    version: '1.0.0'
  });
});

module.exports = router; 