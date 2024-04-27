const express = require('express');
const router = express.Router();

const subcategory_ctrl = require('./controller');

router.get('/getallsubcategoryItems', subcategory_ctrl.getallsubcategoryItems);

router.post("/filtered_items", subcategory_ctrl.filtered_items);

module.exports = router;