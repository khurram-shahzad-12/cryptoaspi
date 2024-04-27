const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const product_model = require('./model');

const product_detail = async (req, res) => {
  try {
    var product_detail = await product_model.product_detail(req);
    if (product_detail.product.length > 0) {
      resp.successResponse(res, product_detail, 'productdetail fetched successfully');
    } else if (product_detail.product.length <= 0) {
      resp.nodatafound(res, product_detail);
    } else {
      resp.errorResponse(res);
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}


const product_detail_id = async (req, res) => {
  try {
    var product_detail_id = await product_model.product_detail_id(req);
    if (product_detail_id.product.length > 0) {
      resp.successResponse(res, product_detail_id, 'productdetail fetched successfully');
    } else if (product_detail_id.product.length <= 0) {
      resp.nodatafound(res, product_detail_id);
    } else {
      resp.errorResponse(res);
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const get_relatedItems = async (req, res) => {
  try {
    var get_relatedItems = await product_model.get_relatedItems(req);
    if (get_relatedItems.related_products.length > 0) {
      resp.successResponse(res, get_relatedItems, 'Realted Items fetched successfully');
    } else if (get_relatedItems.related_products.length <= 0) {
      resp.nodatafound(res, get_relatedItems);
    } else {
      resp.errorResponse(res);
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

module.exports = {
  product_detail: product_detail,
  get_relatedItems: get_relatedItems,
  product_detail_id: product_detail_id
}