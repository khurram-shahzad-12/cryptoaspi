const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const brand_model = require('./model');

const getAllBrandItems = async (req, res) => {
  try {
    var getallsubcategoryItems = await brand_model.getAllBrandItems(req);
    if (getallsubcategoryItems == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: getallsubcategoryItems
      })
    }
  } catch (err) {
    return res.status(501).json({
      message: "something went wrong",
      status: "failure",
      data: []
    })
  }
}

module.exports = {
  getAllBrandItems: getAllBrandItems,
}