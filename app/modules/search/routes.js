const express = require('express');
const router = express.Router();

const search_ctrl = require('./controller');

router.get("/searchproducts", search_ctrl.searchproducts);

router.get("/search_result_items", search_ctrl.search_result_items);

module.exports = router;