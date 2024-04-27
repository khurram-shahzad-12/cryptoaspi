const resp = require('../../helpers/responseHelpers');
const model = require('./model');

// --------------------------------------------------------------------------
const AddToCart = async (req, res) => {

    try {

        var response = await model.AddToCart(req);

        if (response == 'error') {
            resp.errorResponse(res);
        } else if (response == 'invalid_token') {
            resp.invalidResponse(res);
        } else {
            resp.successResponse(res, response, 'Data saved sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

// -----------------------------------------------------------------
const GetFromCart = async (req, res) => {

    try {

        var items = await model.GetFromCart(req);
        if (items == 'error') {
            resp.errorResponse(res);
        } else if (items == 'invalid_token') {
            resp.invalidResponse(res);
        } else if (items == 'notfound') {
            resp.nodatafound(res);
        } else {
            resp.successResponse(res, items, 'Cart fetched sucessfully');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

// -----------------------------------------------------------------
const changeCartQuantity = async (req, res) => {

    try {

        var response = await model.changeCartQuantity(req);
        if (response == 'error') {
            resp.errorResponse(res);
        } else {
            resp.successResponse(res, response, 'Data saved sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

// -----------------------------------------------------------------
const removeFromCart = async (req, res) => {

    try {

        var response = await model.removeFromCart(req);
        if (response == 'error') {
            resp.errorResponse(res);
        } else {
            resp.successResponse(res, [], 'Data Removed sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}
const updateCartStatus = async (req, res) => {

    try {

        var response = await model.updateCartStatus(req);
        if (response == 'error') {
            resp.errorResponse(res);
        } else {
            resp.successResponse(res, [], 'Data Removed sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

// -----------------------------------------------------------------
const GetPlaceOrder = async (req, res) => {

    try {

        var items = await model.GetPlaceOrder(req);
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

// -----------------------------------------------------------------
const postPlaceOrder = async (req, res) => {

    try {

        var response = await model.postPlaceOrder(req);
        if (response == 'error') {
            resp.errorResponse(res);
        } else {
            resp.successResponse(res, response, 'Data Saved sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

// ---------------------------------------------------------------------------
const getUserDefaultAddress = async (req, res) => {

    try {

        var response = await model.getUserDefaultAddress(req);
        if (response == 'error') {
            resp.errorResponse(res);
        } else {
            resp.successResponse(res, response, 'Data Saved sucessfully.');
        }
    } catch (err) {
        resp.errorResponse(res);
    }
}

module.exports = {
    AddToCart: AddToCart,
    GetFromCart: GetFromCart,
    changeCartQuantity: changeCartQuantity,
    removeFromCart: removeFromCart,
    updateCartStatus:updateCartStatus,
    GetPlaceOrder: GetPlaceOrder,
    postPlaceOrder: postPlaceOrder,
    getUserDefaultAddress: getUserDefaultAddress

}