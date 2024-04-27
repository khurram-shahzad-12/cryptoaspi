const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const category_model = require('./model');

// -----------------------------------------------------------
const getcategorylist = async (req, res) => {
  try {

    var result = await category_model.getcategorylist();
    if (result == 'error') {
       resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// ----------------------------------------------------
const getallcategoryItems = async (req, res) => {
  try {
    var result = await category_model.getallcategoryItems(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    console.log('erro ctrl',err)
    resp.errorResponse(res);
  }
}

//------------------------------------------------------------
const getallItems = async (req, res) => {
  try {
    var result = await category_model.getallItems(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// ------------------------------------------------
const subcategoryMetatags = async (req, res) => {
  try {
    var result = await category_model.subcategoryMetatags(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -------------------------------------------------------------------

const subsubcategoryMetatags = async (req, res) => {
  try {
    var result = await category_model.subsubcategoryMetatags(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------

const brandsMetatags = async (req, res) => {
  try {
    var result = await category_model.brandsMetatags(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

module.exports = {
  getcategorylist: getcategorylist,
  getallcategoryItems: getallcategoryItems,
  getallItems:getallItems,
  subcategoryMetatags:subcategoryMetatags,
  subsubcategoryMetatags: subsubcategoryMetatags,
  brandsMetatags: brandsMetatags,
}