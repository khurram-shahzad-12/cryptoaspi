const express = require('express');
const router = express.Router();

const controller = require('./controller');

router.get('/getcategorylist', controller.getcategorylist);

router.get('/getallcategoryItems', controller.getallcategoryItems);

router.get('/getallItems', controller.getallItems);

router.post('/subcategorymetatags', controller.subcategoryMetatags);

router.post('/subsubcategorymetatag',controller.subsubcategoryMetatags);

router.post('/brandsmetatags',controller.brandsMetatags);

module.exports = router;