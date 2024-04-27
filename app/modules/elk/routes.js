const express = require('express');
const router = express.Router();

const elk_ctrl = require('./controller');

router.post("/elk_submit_products", elk_ctrl.postproducts);

router.post("/elk_submit_search_redirect", elk_ctrl.postsearch_redirect);

module.exports = router;