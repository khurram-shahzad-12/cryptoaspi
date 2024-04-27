const sendemailerr = require('../../helpers/email').emailerr;
const resp = require('../../helpers/responseHelpers');


const elk_model = require('./model');

const postproducts = async (req, res) => {

  try {
    var postproducts = await elk_model.postproducts(req);
    if (postproducts == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, postproducts, 'data indexed into elk successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
  return postproducts;

}

const postsearch_redirect = async (req, res) => {

  try {
    var postsearch_redirect = await elk_model.postsearch_redirect(req);
    if (postsearch_redirect == 'error') {
      resp.errorResponse(res);
    } else {
      resp.successResponse(res, postsearch_redirect, 'data saved successfully');
    }
  } catch (err) {
    resp.errorResponse(res);
  }
  return postproducts;

}


module.exports = {
  postproducts: postproducts,
  postsearch_redirect:postsearch_redirect,
 }