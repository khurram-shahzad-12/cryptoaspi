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
router.post('/getuserdefaultaddress',authenticate, controlller.getUserDefaultAddress);
router.post('/postpostPlaceOrder',authenticate, controlller.postPlaceOrder_new);

module.exports = router;
