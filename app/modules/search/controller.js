const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');


const search_model = require('./model');

const searchproducts = async (req, res) => {
  try {
    var searchproducts = await search_model.searchproducts(req);
    if (searchproducts == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, searchproducts, 'products searched successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const search_result_items = async (req, res) => {
  try {
    var search_result_items = await search_model.search_result_items(req);
    if (search_result_items.hasOwnProperty('products')) {
      if ((search_result_items.products.length > 0)) {
        resp.successResponse(res, search_result_items, 'products searched successfully');
      } else if (search_result_items.products.length <= 0) {
        resp.nodatafound(res, search_result_items);
      } else {
        resp.errorResponse(res);
      }
    } else {
      resp.successResponse(res, search_result_items, 'products searched successfully');
    }

  } catch (err) {
    resp.errorResponse(res);
  }
}

module.exports = {
  searchproducts: searchproducts,
  search_result_items: search_result_items
}