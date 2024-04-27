const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const subcategory_model = require('./model');

const getallsubcategoryItems = async (req, res) => {
  try {
    var getallsubcategoryItems = await subcategory_model.getallsubcategoryItems(req);
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
const filtered_items = async (req, res) => {
  try {
    var filtered_items = await subcategory_model.filtered_items(req);
    if (filtered_items == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: filtered_items
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
  getallsubcategoryItems: getallsubcategoryItems,
  filtered_items: filtered_items
}