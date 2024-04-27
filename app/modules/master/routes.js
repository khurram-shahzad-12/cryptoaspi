const express = require('express');
const router = express.Router();

const controller = require('./controller');

router.get('/GetNationality',controller.GetNationality);
router.get('/getLocations',controller.getLocations);
router.get('/getAreas',controller.getAreas);

module.exports = router;
