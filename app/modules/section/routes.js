const express = require('express');
const router = express.Router();

const section_ctrl = require('./controller');

router.get('/sectionItems', section_ctrl.sectionItems);

router.get('/blogs', section_ctrl.blogs);

router.get('/blogByCatId', section_ctrl.blogByCatId);

router.get('/clearance_sale', section_ctrl.clearance_sale);

router.get('/deal_of_the_day', section_ctrl.deal_of_the_day);

router.get('/top_selling_products', section_ctrl.top_selling_products);

router.get('/saver_zone1', section_ctrl.saver_zone1);

router.get('/getInfinteScrollItems', section_ctrl.getInfinteScrollItems);

router.post('/metatags',section_ctrl.sectionMetatags);

module.exports = router;