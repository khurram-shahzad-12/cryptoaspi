const resp = require('../../helpers/responseHelpers');

const profile_model = require('./model');

// --------------------------------------------------------------------------
const getalladdresses = async (req, res) => {
  try {
    var result = await profile_model.getalladdresses(req);
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

// --------------------------------------------------------------------------
const postUserAddress = async (req, res) => {

  try {

    var response = await profile_model.postUserAddress(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, response, 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------------
const updatestatus = async (req, res) => {

  try {

    var response = await profile_model.updatestatus(req);
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
const postWishList = async (req, res) => {

  try {

    var response = await profile_model.postWishList(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, response, 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------------
const getWishLists = async (req, res) => {
  try {
    var result = await profile_model.getWishLists(req);
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

// --------------------------------------------------------------------------
const saveDefaultAddress = async (req, res) => {

  try {

    var response = await profile_model.saveDefaultAddress(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else if (response == 'invalid') {
      resp.errorResponse(res, 'Address Id not a valid');
    } else {
      resp.successResponse(res, response, 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------------
const getMyProfile = async (req, res) => {
  try {
    var result = await profile_model.getMyProfile(req);
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

// --------------------------------------------------------------------------
const updateMyProfile = async (req, res) => {

  try {

    var response = await profile_model.updateMyProfile(req);
    if (response.status == 'validation') {
      resp.inputValidateError(res, response.data);
    } else if (response.status == 'exists') {
      resp.existsResponse(res, [], 'This email is already exist in our database,Please enter unique email address');
    } else if (response.status == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, response.data, 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------------
const deleteUserAddress = async (req, res) => {

  try {

    var response = await profile_model.deleteUserAddress(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else
      if (response == 'invalid') {
        resp.errorResponse(res, 'Address ID not a valid');
      } else {
        resp.successResponse(res, response, 'Data Deleted sucessfully.');
      }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// --------------------------------------------------------------------------
const changePassword = async (req, res) => {

  try {

    var response = await profile_model.changePassword(req);
    if (response == 'validation') {
      resp.successResponse(res,[], 'Password is weak ! Should contain Minimum 6 characters','error');
    } else if (response == 'wrong') {
      resp.successResponse(res, [], 'Old Password is Wrong! Please Enter Current Password','error');
    } else if (response == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, [], 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -----------------------------------------------------------------------------
const selectaddress = async (req, res) => {

  try {

    var response = await profile_model.selectaddress(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else if (response == 'invalid') {
      resp.errorResponse(res, 'Address Id not a valid');
    } else {
      resp.successResponse(res, response, 'Data saved sucessfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}


module.exports = {
  getalladdresses: getalladdresses,
  postUserAddress: postUserAddress,
  postWishList: postWishList,
  getWishLists: getWishLists,
  saveDefaultAddress: saveDefaultAddress,
  getMyProfile: getMyProfile,
  updateMyProfile: updateMyProfile,
  deleteUserAddress: deleteUserAddress,
  changePassword: changePassword,
  updatestatus: updatestatus,
  selectaddress: selectaddress,
}