const express = require('express');
const router = express.Router();

const AuthController = require('./AuthController');

const authenticate = require('../../../middleware/Authenticate');

router.post('/CheckEmail', AuthController.CheckEmail);
router.post('/Signup', AuthController.Signup);
router.post('/Login', AuthController.Login);
router.post('/verifyOtp', authenticate, AuthController.verifyOtp);
router.post('/reSendOtp', AuthController.reSendOtp);
router.post('/reSendOtpWhatsapp', AuthController.reSendOtpWhatsapp);
router.post('/checkMobile',  AuthController.checkMobile);
router.post('/verifyMobileOtp', AuthController.verifyMobileOtp);
router.post('/deleteaccount',authenticate,AuthController.delete_account);

module.exports = router;
