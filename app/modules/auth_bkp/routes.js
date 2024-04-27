const express = require('express');
const router = express.Router();

const AuthController = require('./AuthController');

const authenticate = require('../../../middleware/Authenticate');

router.post('/CheckEmail', AuthController.CheckEmail);
router.post('/Signup', AuthController.Signup);
router.post('/Login', AuthController.Login);
router.post('/verifyOtp', authenticate, AuthController.verifyOtp);
router.post('/reSendOtp', authenticate, AuthController.reSendOtp);

module.exports = router;
