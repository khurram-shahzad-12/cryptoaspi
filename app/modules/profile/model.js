const db = require('../../db');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const FunctionsHelper = require('../../helpers/functionsHelper');
const moment = require('moment');

const { Validator } = require('node-input-validator');

const CheckEmail = require('../auth/model');
const { response } = require('express');

const section_model = require('../section/model');

// -------------------------------------------ok
const getalladdresses = async (req) => {

    try {
        const country_id = process.env.country_id;
        var loginId = req.user.user_id;
        where = 'WHERE user_id=' + loginId;
        if (typeof req.query.idaddress != 'undefined' && req.query.idaddress > 0) {
            where = 'WHERE id =' + req.query.idaddress + ' AND user_id=' + loginId;
        }
        var query = `SELECT * FROM ourshopee_user_address ${where} AND country_id = ${country_id}`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            const output = await result[0].map((Element) => {
                return {
                    idaddress: Element.id,
                    first_name: Element.name,
                    last_name: Element.last_name,
                    company: Element.company,
                    mobile: Element.mobile,
                    emirate: Element.emirate,
                    area: Element.area,
                    address: Element.address,
                    address2: Element.address2,
                    building_name: Element.building_name,
                    latitude: Element.latitude,
                    longitude: Element.longitude,
                    default_address: Element.default_address,
                    status:Element.status,
                    select_address: Element.select_address,
                }
            })
            return output;
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------ok
const updatestatus=async(req,res)=>{
    try {
        const body=req.body;
        var loginId = req.user.user_id;
        if(body.status){
            body.status=body.status;
        }else{
            body.status=0;
        };

        if (typeof body.idaddress != 'undefined' && body.idaddress > 0) {
            const sql= `UPDATE ourshopee_user_address SET status='${body.status}' WHERE id = '${body.idaddress}' AND  user_id='${loginId}'`;
            const response=await db.runQuery(sql);
            if(response){
                return body.idaddress;
            }
        }
        
    } catch (error) {
        return 'error';
    }
}



// -------------------------------------------------
// make your address select

const selectaddress = async (req, res) => {

    try {
        var loginId = req.user.user_id;
        var body = req.body;
        if (body.idaddress > 0) {
            var sql_update = `UPDATE ourshopee_user_address SET select_address=0 WHERE  user_id='${loginId}' `;
            await db.runQuery(sql_update);
            var sql = `UPDATE  ourshopee_user_address SET select_address=1 
            WHERE id = '${body.idaddress}' AND  user_id='${loginId}' `;
            var response = await db.runQuery(sql);
            if (response) {
                return body.idaddress;
            }
        } else {
            return 'invalid';
        }

    } catch (err) {
        return 'error';
    }
}



// -----------------------------------------------------------
const postUserAddress = async (req, res) => {

    try {
        const currentDateTime = await datetimeHelper.currentDateTime();
        const country_id = process.env.country_id;
        var loginId = req.user.user_id;
        var body = req.body;
        if (body.default_address) {
            body.default_address = 1;
        } else {
            body.default_address = 0;
        }
        if (body.status) {
            body.status = body.status;
        } else {
            body.status = 0;
        }
        
        
        if (typeof body.idaddress != 'undefined' && body.idaddress > 0) {
            if(body.default_address === 1){
                var sql_update = `UPDATE  ourshopee_user_address SET default_address=0 WHERE  user_id='${loginId}' `;
            await db.runQuery(sql_update);
            
            var sql = `UPDATE  ourshopee_user_address SET name='${body.first_name}',last_name='', company='', mobile='${body.mobile}', emirate='${body.emirate}', area='${body.area}', address='${body.address}',  address2='${body.address2}', building_name='${body.building_name}', latitude='${body.latitude}', longitude='${body.longitude}', default_address='${body.default_address}',
            status='${body.status}' 
            WHERE id = '${body.idaddress}' AND  user_id='${loginId}' `;
            var response = await db.runQuery(sql);
            if (response) {
                return {idaddress: body.idaddress};
            }
        }else{
            var sql = `UPDATE  ourshopee_user_address SET name='${body.first_name}',last_name='', company='', mobile='${body.mobile}', emirate='${body.emirate}', area='${body.area}', address='${body.address}',  address2='${body.address2}', building_name='${body.building_name}', latitude='${body.latitude}', longitude='${body.longitude}', default_address='${body.default_address}',
            status='${body.status}' 
            WHERE id = '${body.idaddress}' AND  user_id='${loginId}' `;
            var response = await db.runQuery(sql);
            if (response) {
                return {idaddress: body.idaddress};
            }

        }
        } else {
            if(body.default_address === 1){
                var sql_update = `UPDATE  ourshopee_user_address SET default_address=0 WHERE  user_id='${loginId}' `;
            await db.runQuery(sql_update);
            var sql = `INSERT INTO ourshopee_user_address(country_id, user_id, name, last_name, company, mobile, emirate,  area, address, address2, building_name, date, latitude, longitude, deleted,default_address,status)
            VALUES('${country_id}', '${loginId}', '${body.first_name}', '','', '${body.mobile}', '${body.emirate}', '${body.area}', '${body.address}', '${body.address2}', '${body.building_name}', '${currentDateTime}', '${body.latitude}', '${body.longitude}', 0, '${body.default_address}','${body.status}')`;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                return { idaddress: result[0].insertId}
            }

            }else{
                var sql = `INSERT INTO ourshopee_user_address(country_id, user_id, name, last_name, company, mobile, emirate,  area, address, address2, building_name, date, latitude, longitude, deleted,default_address,status)
            VALUES('${country_id}', '${loginId}', '${body.first_name}', '','', '${body.mobile}', '${body.emirate}', '${body.area}', '${body.address}', '${body.address2}', '${body.building_name}', '${currentDateTime}', '${body.latitude}', '${body.longitude}', 0, '${body.default_address}','${body.status}')`;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                return { idaddress: result[0].insertId }
            }
            }
            
        }
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------ok
const saveDefaultAddress = async (req, res) => {

    try {
        var loginId = req.user.user_id;
        var body = req.body;
        if (body.idaddress > 0) {
            var sql_update = `UPDATE  ourshopee_user_address SET default_address=0 WHERE  user_id='${loginId}' `;
            await db.runQuery(sql_update);
            var sql = `UPDATE  ourshopee_user_address SET default_address=1 
            WHERE id = '${body.idaddress}' AND  user_id='${loginId}' `;
            var response = await db.runQuery(sql);
            if (response) {
                return body.idaddress;
            }
        } else {
            return 'invalid';
        }

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------ok
const postWishList = async (req, res) => {

    try {
        const currentDateTime = await datetimeHelper.currentDateTime();
        const country_id = process.env.country_id;
        var loginId = req.user.user_id;
        var body = req.body;

        var query = `SELECT wishlist_id,rstatus FROM ourshopee_user_wishlist WHERE user_id='${loginId}' AND product_id='${body.product_id}' `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            var rstatus = result[0][0].rstatus;
            if (rstatus == 2) {
                var sql = `UPDATE  ourshopee_user_wishlist SET rstatus=1 WHERE user_id = '${loginId}' AND  product_id='${body.product_id}' `;
                await db.runQuery(sql);
                return 1;
            } else {
                var sql = `UPDATE  ourshopee_user_wishlist SET rstatus=2 WHERE user_id = '${loginId}' AND  product_id='${body.product_id}' `;
                await db.runQuery(sql);
                return 2;
            }
        } else {
            var sql = `INSERT INTO ourshopee_user_wishlist(user_id, country_id, product_id, sku, rstatus,created_date)
            VALUES('${loginId}', '${country_id}', '${body.product_id}', '${body.sku}', 1, '${currentDateTime}')`;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                return 1;
            }
        }

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------ok
const getWishLists = async (req) => {

    try {

        const currentDateTime = await datetimeHelper.currentDateTime();
        var output = [];
        var productList = [];
        var loginId = req.user.user_id;
        var query = `select uw.wishlist_id, uw.product_id FROM ourshopee_user_wishlist uw 
        WHERE uw.rstatus=1 and  uw.user_id=${loginId}`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            var product_array = result[0].map((ele) => {
                return ele.product_id
            });
            productList = await section_model.get_products_by_ids_elk(product_array);
        } else {
            return 'notfound';
        }


        if (productList.length > 0) {

            output = await productList.map((ele) => {

                var currentdate = moment(currentDateTime).unix();
                if (ele.from_date != '0000-00-00 00:00:00') {
                    var promotion_from = moment(ele.from_date).unix();
                }
                if (ele.to_date != '0000-00-00 00:00:00') {
                    var promotion_to = moment(ele.to_date).unix();
                }
                if (currentdate > promotion_from && currentdate < promotion_to) {
                    display_price = ele.promotion_price;
                } else {
                    display_price = ele.special_price;
                }
                price = ele.price;
                diff = price - display_price;
                percentage = diff / price * 100;
                timage = ele.image;
                if (parseInt(ele.special_price) > 0) {
                    sale_on = Math.round(((ele.price - display_price) / ele.price) * 100);
                }
                var afterlenght = '';
                if (ele.url != '') {
                    afterlenght = ele.url.substr(0, 60); // 'M'

                }
                //var show_image = process.env.product + 'thump/' + ele.image;
                var show_image_path = afterlenght + '/' + ele.sku + '/';
                return {
                    id: ele.id,
                    name: ele.name,
                    sku: ele.sku,
                    image: ele.image,
                    display_price: "AED " + display_price,
                    old_price: "AED " + ele.price,
                    percentage: Math.round(percentage),
                    url: show_image_path,
                }
            });
            return output;
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------ok
const getMyProfile = async (req) => {

    try {
        var loginId = req.user.user_id;
        var query = `SELECT first_name, first_name,last_name, email, gender, nationality, mobile, status, vip  FROM ourshopee_register WHERE id=${loginId} `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0];
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

// ------------------------------------------- ok
const updateMyProfile = async (req, res) => {

    try {
        var loginId = req.user.user_id;
        var body = req.body;
        const isExists = await CheckEmail.CheckEmail(req, 'update');

        if (isExists.length > 0) {
            return { "status": 'exists', 'data': '' };
        }
        const v = new Validator(body, {
            first_name: 'required',
            last_name: 'required',
            gender: 'required',
            nationality: 'required',
            mobile: 'required|maxLength:9',
            email: 'required|email',
        });
        const matched = await v.check();
        if (!matched) {
            return {
                "status": 'validation',
                "data": v.errors
            };
        }
        var sms_verification = 0;
        const getOldMobileNumber = await getMyProfile(req);
        // if (getOldMobileNumber.length > 0) {
        //     OldNumber = getOldMobileNumber[0].mobile
        //     Oldstatus = getOldMobileNumber[0].status
        //     OldNumber = OldNumber.replace(/\s/g, '');
        //     mobile = body.mobile.replace(/\s/g, '');
        //     if (OldNumber != mobile || Oldstatus == 0) {
        //         var refid = Math.floor(1000 + Math.random() * 9000);
        //         var sql_update = `UPDATE  ourshopee_register SET status = 0, refid='${refid}'  
        //         WHERE  id='${loginId}' `;
        //         var response = await db.runQuery(sql_update);
        //         if (response) {
        //             // send sms to new mobile number -------------------
        //             message = "Hi,Your activation code is " + refid + ", enter this code to complete the account activation process. for more www.OurShopee.com"
        //             FunctionsHelper.Send_SMS(mobile, message);
        //             sms_verification = 1;
        //         }
        //     }
        // }
        var sql_update = `UPDATE  ourshopee_register SET first_name='${body.first_name}', last_name='${body.last_name}',gender='${body.gender}',nationality='${body.nationality}',mobile='${body.mobile}',email='${body.email}'
                WHERE  id='${loginId}' `;
        var response_1 = await db.runQuery(sql_update);
        if (response_1) {
            return { "status": 'success', "data": sms_verification };
        }
    } catch (err) {
        console.log(err);
        return { "status": 'error' };
    }
}

// ------------------------------------------- ok
const deleteUserAddress = async (req, res) => {

    try {
        var loginId = req.user.user_id;
        if (typeof req.body.idaddress != 'undefined' && req.body.idaddress > 0) {

            var query = `DELETE FROM ourshopee_user_address WHERE id=${req.body.idaddress}  AND user_id=${loginId}`;
            var response = await db.runQuery(query);
            if (response[0].affectedRows == 1) {
                return true;
            } else {
                return 'invalid';
            }
        } else {
            return 'invalid';
        }
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const changePassword = async (req) => {

    try {
        var loginId = req.user.user_id;

        if (typeof req.body.new_password != 'undefined' && req.body.new_password.length > 5) {

            var query = `SELECT id FROM ourshopee_register WHERE id=${loginId} AND password=PASSWORD('${req.body.old_password}') `;
            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                var query_update = `UPDATE ourshopee_register SET password=PASSWORD('${req.body.new_password}') WHERE id=${loginId} `;
                await db.runQuery(query_update);
                return 'success';

            } else {
                return 'wrong';
            }
        } else {
            return 'validation';
        }
    } catch (err) {
        return 'error';
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