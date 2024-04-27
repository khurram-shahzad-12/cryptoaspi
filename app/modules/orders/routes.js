const express = require('express');
const router = express.Router();

const authenticate = require('../../../middleware/Authenticate');

const controlller = require('./controller');

router.get('/myOrders', authenticate, controlller.myOrders);

router.post('/checkCouponCode', authenticate, controlller.checkCouponCode);

router.post('/checkOrder', controlller.checkOrder);

router.post('/addComplaint', controlller.addComplaint);

router.post('/getComplaint', controlller.getComplaint);


module.exports = router;
