const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const home_model = require('./model');

const nodecache = require('node-cache');

const appCache = new nodecache({ stdTTL: 7200, checkperiod: 120 });

// ----------------------------------------------------------------
const getbanner = async (req, res) => {
  try {
    /*  if (appCache.has('carousel_list')) {
       resp.successResponse(res, appCache.get('carousel_list'), 'All banner lists');
     }
     else { */
    var banner_results = await home_model.gatbannerslist();
    var carousel_results = await home_model.gatcarousellist();
    var multibannerslist = await home_model.multibannerslist();

    const return_output = {
      "carousel": carousel_results,
      "banner": banner_results,
      "multibanners": multibannerslist
    }

    if (banner_results == 'error' && carousel_results == 'error' && multibannerslist == 'error') {
      resp.errorResponse(res);
    } else {
      appCache.set("carousel_list", return_output);
      resp.successResponse(res, return_output, 'All banner lists');
    }
    //}
  } catch (err) {
    resp.errorResponse(res);
  }
}

// ----------------------------------------------------------
const deal_offers = async (req, res) => {
  try {
    var elk_data = await home_model.exicting_offers();
    const return_output = {
      "exciting_offers": elk_data.exciting_offers,
      "deal_of_the_day": elk_data.deal_of_the_day
    }
    if (elk_data == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, return_output, 'Exciting offers and Deal of the Day items');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------
const bundle_clearance_sale = async (req, res) => {
  try {
    var elk_op = await home_model.bundle_deals();
    const return_output = {
      "bundle_deals": elk_op.bundle_deals,
      "clearance_sale": elk_op.clearance_sale
    }
    if (elk_op == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, return_output, 'Bundle and clearence sale items');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -------------------------------------------------------------------
const category_items = async (req, res) => {
  try {
    var category_items = await home_model.category_items();
    if (category_items == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, category_items, 'All Category Items');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getMaxDiscount = async (req, res) => {
  try {

    var result = await home_model.getMaxDiscount();
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getTopPicks = async (req, res) => {
  try {

    var result = await home_model.getTopPicks();
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getTopSelling = async (req, res) => {
  try {

    var result = await home_model.getTopSelling(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getDealOfTheDay = async (req, res) => {
  try {

    var result = await home_model.getDealOfTheDay(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getSaverZone = async (req, res) => {
  try {

    var result = await home_model.getSaverZone(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------
const getCategorySection = async (req, res) => {
  try {

    var result = await home_model.getCategorySection(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const brand_week = async (req, res) => {
  try {
    var result = await home_model.brand_week(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}
const pre_owned = async (req, res) => {
  try {
    var result = await home_model.pre_owned(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, result[0].items, 'Data fetched sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

module.exports = {
  getbanner: getbanner,
  brand_week: brand_week,
  pre_owned: pre_owned,
  deal_offers: deal_offers,
  bundle_clearance_sale: bundle_clearance_sale,
  category_items: category_items,
  getMaxDiscount: getMaxDiscount,
  getTopPicks: getTopPicks,
  getTopSelling: getTopSelling,
  getDealOfTheDay: getDealOfTheDay,
  getSaverZone: getSaverZone,
  getCategorySection: getCategorySection,
}