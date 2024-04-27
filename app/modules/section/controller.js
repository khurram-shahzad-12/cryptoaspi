const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');

const section_model = require('./model');

const sectionItems = async (req, res) => {
  try {
    var sectionItems = await section_model.sectionItems(req);
    if (sectionItems == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: sectionItems
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

const blogs = async (req, res) => {
  try {
    var blogItems = await section_model.blogs(req);
    if (blogItems == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Blogs fetched Successfully",
        status: "success",
        data: blogItems
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

const blogByCatId = async (req, res) => {
  try {
    var blogItems = await section_model.blogByCatId(req);
    if (blogItems == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: blogItems
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

const clearance_sale = async (req, res) => {
  try {
    var clearance_sale = await section_model.clearance_sale(req);
    if (clearance_sale == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: clearance_sale
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

const deal_of_the_day = async (req, res) => {
  try {
    var deal_of_the_day = await section_model.deal_of_the_day(req);
    if (deal_of_the_day == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: deal_of_the_day
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

const top_selling_products = async (req, res) => {
  try {
    var top_selling_products = await section_model.top_selling_products(req);
    if (top_selling_products == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: top_selling_products
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

const saver_zone1 = async (req, res) => {
  try {
    var saver_zone = await section_model.saver_zone1(req);
    if (saver_zone == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: saver_zone
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

//------------------------------------------------------------
const getInfinteScrollItems = async (req, res) => {
  try {
    var result = await section_model.getInfinteScrollItems(req);
    if (result == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, result, 'Data fetched successfully.');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
}


// -------------------------------------------------
const sectionMetatags = async (req, res) => {
  try {
    var meta_tags = await section_model.sectionMetatags(req);
    if (meta_tags == 'error') {
      return res.status(501).json({
        message: "something went wrong",
        status: "failure",
        data: []
      })
    } else {
      return res.status(200).json({
        message: "Data fetched Successfully",
        status: "success",
        data: meta_tags,
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
  sectionItems: sectionItems,
  clearance_sale: clearance_sale,
  deal_of_the_day: deal_of_the_day,
  top_selling_products: top_selling_products,
  saver_zone1: saver_zone1,
  blogs: blogs,
  blogByCatId: blogByCatId,
  getInfinteScrollItems: getInfinteScrollItems,
  sectionMetatags: sectionMetatags,
}