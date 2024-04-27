const express = require('express');
const router = express.Router();

const profile_ctrl = require('./controller');
const authenticate =require('../../../middleware/Authenticate');

router.get('/getalladdresses', authenticate, profile_ctrl.getalladdresses);
router.post('/postUserAddress', authenticate, profile_ctrl.postUserAddress);
router.post('/postWishList', authenticate, profile_ctrl.postWishList);
router.get('/getWishLists', authenticate, profile_ctrl.getWishLists);
router.post('/saveDefaultAddress', authenticate, profile_ctrl.saveDefaultAddress);
router.get('/getMyProfile', authenticate, profile_ctrl.getMyProfile);
router.post('/updateMyProfile', authenticate, profile_ctrl.updateMyProfile);
router.post('/deleteUserAddress', authenticate, profile_ctrl.deleteUserAddress);
router.post('/changePassword', authenticate, profile_ctrl.changePassword);
router.post("/updatestatus", authenticate, profile_ctrl.updatestatus);
router.post("/selectaddress", authenticate, profile_ctrl.selectaddress);
module.exports = router;
