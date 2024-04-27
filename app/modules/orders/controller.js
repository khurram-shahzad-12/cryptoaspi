const resp = require('../../helpers/responseHelpers');
const model = require('./model');
const myOrders = async (req, res) => {

  try {

    var items = await model.myOrders(req);
    if (items == 'error') {
      resp.errorResponse(res);
    } else if (items == 'notfound') {
      resp.nodatafound(res);
    } else {
      if(items != ''){
        resp.successResponse(res, items, 'Data fetched sucessfully');
      }else{
        resp.successResponse(res, [], 'Data fetched sucessfully');
      }
      console.log("items",items);
      
    }
  } catch (err) {
    console.log(err);
    resp.errorResponse(res);
  }
}

const checkCouponCode = async (req, res) => {

  try {

    var items = await model.checkCouponCode(req);
    if (items == 'error') {
      resp.errorResponse(res);
    } else if (items == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, items, 'Data fetched sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const checkOrder = async (req, res) => {

  try {

    var items = await model.checkOrder(req);
    if (items == 'error') {
      resp.errorResponse(res);
    } else if (items == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, items, 'Data fetched sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const addComplaint = async (req, res) => {

  try {

    var items = await model.addComplaint(req);
    if (items == 'error') {
      resp.errorResponse(res);
    } else if (items == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, items, 'Data fetched sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

const getComplaint = async (req, res) => {

  try {

    var items = await model.getComplaint(req);
    if (items == 'error') {
      resp.errorResponse(res);
    } else if (items == 'notfound') {
      resp.nodatafound(res);
    } else {
      resp.successResponse(res, items, 'Data fetched sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}


module.exports = {

  myOrders: myOrders,
  checkCouponCode: checkCouponCode,
  checkOrder: checkOrder,
  addComplaint: addComplaint,
  getComplaint: getComplaint
}