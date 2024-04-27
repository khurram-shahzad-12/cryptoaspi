const express = require('express');
const router = express.Router();

const product_ctrl = require('./controller');

router.get("/product_detail", product_ctrl.product_detail);

router.post("/get_relatedItems", product_ctrl.get_relatedItems);

module.exports = router;