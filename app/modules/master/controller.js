const resp = require('../../helpers/responseHelpers');
const model = require('./model');

// -----------------------------------------------
const GetNationality = async (req, res) => {
  try {

    var result = await model.GetNationality();
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

// -----------------------------------------------
const getLocations = async (req, res) => {
  try {

    var result = await model.getLocations(req);
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
// -----------------------------------------------
const getAreas = async (req, res) => {
  try {

    var result = await model.getAreas(req);
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

module.exports = {
  GetNationality,
  getLocations,
  getAreas,
}