const express = require('express');
const router = express.Router();


const home_ctrl = require('./controller');

router.get('/getbannerlist', home_ctrl.getbanner);

router.get('/pre_owned', home_ctrl.pre_owned);

router.get('/deal_offers', home_ctrl.deal_offers);

router.get('/bundle_clearance_sale', home_ctrl.bundle_clearance_sale);

router.get('/category_items', home_ctrl.category_items);

router.get('/brand_week', home_ctrl.brand_week);

router.get('/getCategorySection', home_ctrl.getCategorySection);

router.get('/yui', async (req, res) => {
    if (appCache.has('todos')) {
        console.log('Get data from Node Cache');
        return res.send(appCache.get('todos'))
    }
    else {
        const data = await fetch(todosURL)
            .then((response) => response.json());
        appCache.set("todos", data);
        console.log('Fetch data from API');
        res.send(data);
    }
})

router.get('/getMaxDiscount', home_ctrl.getMaxDiscount);
router.get('/getTopPicks', home_ctrl.getTopPicks);
router.get('/getTopSelling', home_ctrl.getTopSelling);
router.get('/getDealOfTheDay', home_ctrl.getDealOfTheDay);
router.get('/getSaverZone', home_ctrl.getSaverZone);

module.exports = router;
