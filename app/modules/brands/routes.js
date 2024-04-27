const express = require('express');
const router = express.Router();

const brands_ctrl = require('./controller');

router.get('/getAllBrandItems', brands_ctrl.getAllBrandItems);

module.exports = router;

