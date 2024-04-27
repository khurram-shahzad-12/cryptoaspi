const express = require('express');
const router = express.Router();

const authenticate = require('../../../middleware/Authenticate');

const controlller = require('./controller');

router.post('/AddToCart', controlller.AddToCart);
router.post('/GetFromCart', controlller.GetFromCart);
router.post('/changeCartQuantity', controlller.changeCartQuantity);
router.post('/removeFromCart', controlller.removeFromCart);
router.post('/updateCartStatus', authenticate,controlller.updateCartStatus);
router.get('/GetPlaceOrder', authenticate, controlller.GetPlaceOrder);
router.post('/postPlaceOrder', authenticate, controlller.postPlaceOrder);
router.get('/getuserdefaultaddress',authenticate, controlller.getUserDefaultAddress);

module.exports = router;
