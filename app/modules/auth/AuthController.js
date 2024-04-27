const resp = require('../../helpers/responseHelpers');
const Auth_model = require('./model');

//-----------------------------------------------------------
const Signup = async (req, res) => {
  try {
    var result = await Auth_model.Signup(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'exists') {
      resp.successResponse(res, [], 'This email or mobile is already registered with us...Please login to continue', 'error');
    } else {
      resp.successResponse(res, result, 'User registered sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const Login = async (req, res) => {
  try {
    var result = await Auth_model.Login(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else if (result == 'invalid_password') {
      resp.successResponse(res, [], 'Incorrect password','error');
    } else if (result == 'invalid_email') {
      resp.successResponse(res, [], 'This email does not exist','error');
    } else {
      resp.successResponse(res, result, 'User login sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const CheckEmail = async (req, res) => {
  try {
    var response = await Auth_model.CheckEmail(req);
    if (response == 'error') {
      resp.errorResponse(res);
    } else if (response.length > 0) {
      resp.successResponse(res, '', 'This email is already registered with us...Please login to continue', 'error');
    } else {
      resp.successResponse(res, '', 'This email is not registered');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const verifyOtp = async (req, res) => {
  try {
    var response = await Auth_model.verifyOtp(req);
    if (response.status == 'error') {
      resp.errorResponse(res);
    } else if (response.status == 'validation') {
      resp.inputValidateError(res, response.data);
    } else if (response.status == 'invalid') {
      resp.invalidResponse(res, response.data);
    } else {
      resp.successResponse(res, [], 'OTP verified successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const reSendOtp = async (req, res) => {

  try {
    var response = await Auth_model.reSendOtp(req);
    if (response.status == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, [], 'OTP send successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const reSendOtpWhatsapp = async (req, res) => {
  try {
    var response = await Auth_model.reSendOtpWhatsapp(req);
    if (response.status == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, [], 'OTP send successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const checkMobile = async (req, res) => {
  try {
    var response = await Auth_model.checkMobile(req);
    if (response.status == 'error') {
      resp.errorResponse(res);
    } else if (response.status == 'validation') {
      // resp.errorResponse(res,response.data);
      resp.successResponse(res, '', response.data, response.status);
    } else if (response.status == 'exits') {
      // resp.errorResponse(res,'This mobile is already registered with us...Please use different mobile number or login with us.');
      resp.successResponse(res, '', response.data, response.status);
    } else if (response.status == 'success') {
      resp.successResponse(res, '', response.data);
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

//-----------------------------------------------------------
const verifyMobileOtp = async (req, res) => {
  try {
    var response = await Auth_model.verifyMobileOtp(req);
    if (response.status == 'error') {
      resp.errorResponse(res);
    } else if (response.status == 'validation') {
      // resp.inputValidateError(res, '',response.data);
      resp.successResponse(res, [], response.data, response.status);
    } else if (response.status == 'invalid') {
      // resp.invalidResponse(res,'' ,response.data);
      resp.successResponse(res, [], response.data, response.status);
    } else {
      resp.successResponse(res, [], 'OTP verified successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

// -------------------------------------------------------------------------------
const delete_account = async (req, res) => {
  try {
    var result = await Auth_model.delete_account(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'User deleted sucessfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}

module.exports = {
  CheckEmail,
  Signup,
  Login,
  verifyOtp,
  reSendOtp,
  reSendOtpWhatsapp,
  checkMobile,
  verifyMobileOtp,
  delete_account,
}
