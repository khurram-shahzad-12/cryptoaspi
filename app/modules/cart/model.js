const db = require('../../db');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const sendemailerr = require('../../helpers/email').emailerr;
const moment = require('moment');
const section_model = require('../section/model');
const profile_model = require('../profile/model');
const { async } = require('q');
const jwt = require('jsonwebtoken');
const axios=require("axios");
const { application, json } = require('express');

// -------------------------------------------ok
const AddToCart_new = async (req, res) => {

    try {
        if (typeof req.body.ip_address != undefined && req.body.ip_address > 0) {
            ip_address = req.body.ip_address
        } else {
            const randomNumber = Math.floor(Math.random() * 1000000000);
            ip_address = randomNumber;
        }
        const token = req.headers.authorization.split(' ')[1]

        var user_id = 0;
        var token_error = 0;
        if (token != undefined) {

            jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
                if (err) {
                    token_error = 1;
                } else {
                    user_id = decoded.user_id;
                }
            });
        }
        if (token_error == 1) {
            return 'invalid_token';
        }
        const currentDateTime = await datetimeHelper.currentDateTime();
        var product_id = req.body.product_id;
        var body = req.body;
        var query = `SELECT track_id, product_id, total_order, ip_address FROM ourshopee_cart_tracking
        WHERE product_id='${product_id}' AND ip_address='${ip_address}' `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            result = result[0][0];
            var totla_order = parseInt(result.total_order) + 1;
            var track_id = result.track_id;

            var productListFront = await section_model.get_products_by_ids_elk([body.product_id]);
            var dealoftheday = 0;
            // checking frontend items whether item os in dealoffer
            await Promise.all(productListFront.map(async (Element, index) => {
                var current_date = moment(currentDateTime).unix();
                var from_date = '0';
                var to_date = '0';
                if (Element.from_date != '0000-00-00 00:00:00') {
                    from_date = moment(Element.from_date).unix();
                }
                if (Element.to_date != '0000-00-00 00:00:00') {
                    to_date = moment(Element.to_date).unix();
                }
                if (current_date > from_date && current_date < to_date) {
                    dealoftheday = 1;
                } else {
                    dealoftheday = 0
                }
            }));

            if (dealoftheday == 0) {
                var sql = `UPDATE  ourshopee_cart_tracking SET total_order = '${totla_order}' WHERE track_id = '${track_id}' `;
                var response = await db.runQuery(sql);
                if (response) {
                    if (typeof user_id != 'undefined' && user_id > 0) {
                        var update_user = `UPDATE  ourshopee_cart_tracking SET user_id = '${user_id}' WHERE ip_address = '${ip_address}' `;
                        await db.runQuery(update_user);
                    }
                    return { cart_id: track_id, ip_address: ip_address };
                }
            } else {
                return { cart_id: track_id, ip_address: ip_address, msg: "Only one deal product is eligible per order." };
            }
        } else {
            if (typeof user_id != 'undefined' && user_id > 0) {
                where = "WHERE ct.user_id='" + user_id + "'";
            } else {
                where = "WHERE ct.ip_address= '" + ip_address + "'";
            }
            var query121 = `SELECT ct.track_id as cart_id, ct.product_id, ct.total_order, ct.add_date
                        FROM ourshopee_cart_tracking as ct 
                         ${where}`;
            var result121 = await db.runQuery(query121);

            var dealofthedayf = 0;
            var dealofthedayb = 0;
            if (result121[0].length > 0) {
                const currentDateTime = await datetimeHelper.currentDateTime();

                var product_array = result121[0].map((ele) => {
                    return ele.product_id
                });

                var productListDB = await section_model.get_products_by_ids_elk(product_array);

                var productListFront = await section_model.get_products_by_ids_elk([body.product_id]);

                const final_array = await result121[0].map(cart => Object.assign(cart, productListDB.find(product => product.id === cart.product_id)))

                await Promise.all(final_array.map(async (Element, index) => {
                    var current_date = moment(currentDateTime).unix();
                    var from_date = '0';
                    var to_date = '0';
                    if (Element.from_date != '0000-00-00 00:00:00') {
                        from_date = moment(Element.from_date).unix();
                    }
                    if (Element.to_date != '0000-00-00 00:00:00') {
                        to_date = moment(Element.to_date).unix();
                    }
                    if (current_date > from_date && current_date < to_date) {
                        dealofthedayb = 1;
                    }
                }));

                // checking frontend items whether item os in dealoffer
                await Promise.all(productListFront.map(async (Element, index) => {
                    var current_date = moment(currentDateTime).unix();
                    var from_date = '0';
                    var to_date = '0';
                    if (Element.from_date != '0000-00-00 00:00:00') {
                        from_date = moment(Element.from_date).unix();
                    }
                    if (Element.to_date != '0000-00-00 00:00:00') {
                        to_date = moment(Element.to_date).unix();
                    }
                    if (current_date > from_date && current_date < to_date) {
                        if (dealofthedayb == 1) {
                            dealofthedayf = 1;
                        }
                    }
                }));

            }

            if (dealofthedayf == 0) {

                body.action = 'add';
                body.add_date = currentDateTime;
                var sql = `INSERT INTO ourshopee_cart_tracking(action, product_id, ip_address, user_id, add_date)
                VALUES("${body.action}", "${body.product_id}", "${ip_address}",  "${user_id}",  "${body.add_date}")`;
                var result = await db.runQuery(sql);
                if (result[0].insertId != null) {
                    if (typeof user_id != 'undefined' && user_id > 0) {
                        var update_user = `UPDATE  ourshopee_cart_tracking SET user_id = '${user_id}' WHERE ip_address = '${ip_address}' `;
                        await db.runQuery(update_user);
                    }
                    return { cart_id: result[0].insertId, ip_address: ip_address }
                }
            } else {
                return { cart_id: 0, ip_address: ip_address, msg: "Only one deal product is eligible per order." }
            }
        }
    } catch (err) {
        return 'error';
    }
}

const AddToCart = async (req, res) => {

    try {
        if (typeof req.body.ip_address != undefined && req.body.ip_address > 0) {
            var ip_address = req.body.ip_address
        } else {
            const randomNumber = Math.floor(Math.random() * 1000000000);
            var ip_address = randomNumber;
        }
        var user_id = req.body.user_id;
        const currentDateTime = await datetimeHelper.currentDateTime();
        var product_id = req.body.product_id;
        var body = req.body;

        let testquery=`SELECT *  WHERE id = 93117`;
        const testresult=await db.runQuery(testquery);
        // console.log(testresult)
        


        if (user_id > 0) {
            // ip_address = 0
            var query = `SELECT track_id, product_id, total_order, ip_address FROM ourshopee_cart_tracking
            WHERE product_id='${product_id}' AND user_id='${user_id}' and rstatus = 1`;

        } else {
            var query = `SELECT track_id, product_id, total_order, ip_address FROM ourshopee_cart_tracking
            WHERE product_id='${product_id}' AND ip_address='${ip_address}' and rstatus = 1`;
        }




        var result = await db.runQuery(query);
        


        if (result[0].length > 0) {
            result = result[0][0];
            var totla_order = parseInt(result.total_order) + 1;
            var track_id = result.track_id;

            var productListFront = await section_model.get_products_by_ids_elk([body.product_id]);
            var dealoftheday = 0;
            // checking frontend items whether item os in dealoffer
            await Promise.all(productListFront.map(async (Element, index) => {
                var current_date = moment(currentDateTime).unix();
                var from_date = '0';
                var to_date = '0';
                if (Element.from_date != '0000-00-00 00:00:00') {
                    from_date = moment(Element.from_date).unix();
                }
                if (Element.to_date != '0000-00-00 00:00:00') {
                    to_date = moment(Element.to_date).unix();
                }
                if (current_date > from_date && current_date < to_date) {
                    dealoftheday = 1;
                } else {
                    dealoftheday = 0
                }
            }));

            if (dealoftheday == 0) {
                var sql = `UPDATE  ourshopee_cart_tracking SET total_order = '${totla_order}' WHERE track_id = '${track_id}' `;
                var response = await db.runQuery(sql);
                if (response) {
                    return { cart_id: track_id, ip_address: ip_address };
                }
            } else {
                return { cart_id: track_id, ip_address: ip_address, msg: "Only one deal product is eligible per order." };
            }



        } else {
            if (typeof user_id != 'undefined' && user_id > 0) {
                where = "WHERE ct.user_id='" + user_id + "' AND ct.ip_address= '" + ip_address + "' and rstatus = 1";
            } else {
                where = "WHERE ct.ip_address= '" + ip_address + "' and rstatus = 1";
            }
            var query121 = `SELECT ct.track_id as cart_id, ct.product_id, ct.total_order, ct.add_date
                        FROM ourshopee_cart_tracking as ct 
                         ${where}`;
            var result121 = await db.runQuery(query121);

            var dealofthedayf = 0;
            var dealofthedayb = 0;
            if (result121[0].length > 0) {
                const currentDateTime = await datetimeHelper.currentDateTime();

                var product_array = result121[0].map((ele) => {
                    return ele.product_id
                });

                var productListDB = await section_model.get_products_by_ids_elk(product_array);

                var productListFront = await section_model.get_products_by_ids_elk([body.product_id]);

                const final_array = await result121[0].map(cart => Object.assign(cart, productListDB.find(product => product.id === cart.product_id)))

                await Promise.all(final_array.map(async (Element, index) => {
                    var current_date = moment(currentDateTime).unix();
                    var from_date = '0';
                    var to_date = '0';
                    if (Element.from_date != '0000-00-00 00:00:00') {
                        from_date = moment(Element.from_date).unix();
                    }
                    if (Element.to_date != '0000-00-00 00:00:00') {
                        to_date = moment(Element.to_date).unix();
                    }
                    if (current_date > from_date && current_date < to_date) {
                        dealofthedayb = 1;
                    }
                }));


                // checking frontend items whether item os in dealoffer
                await Promise.all(productListFront.map(async (Element, index) => {
                    var current_date = moment(currentDateTime).unix();
                    var from_date = '0';
                    var to_date = '0';
                    if (Element.from_date != '0000-00-00 00:00:00') {
                        from_date = moment(Element.from_date).unix();
                    }
                    if (Element.to_date != '0000-00-00 00:00:00') {
                        to_date = moment(Element.to_date).unix();
                    }
                    if (current_date > from_date && current_date < to_date) {
                        if (dealofthedayb == 1) {
                            dealofthedayf = 1;
                        }
                    }
                }));

            }

            if (dealofthedayf == 0) {
                body.action = 'add';
                body.add_date = currentDateTime;
                var sql = `INSERT INTO ourshopee_cart_tracking(action, product_id, ip_address, user_id, add_date)
                VALUES("${body.action}", "${body.product_id}", "${ip_address}",  "${body.user_id}",  "${body.add_date}")`;
                var result = await db.runQuery(sql);
                if (result[0].insertId != null) {
                    return { cart_id: result[0].insertId, ip_address: ip_address }
                }
            } else {
                return { cart_id: 0, ip_address: ip_address, msg: "Only one deal product is eligible per order." }
            }


        }
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------inprogress
const GetFromCart = async (req) => {

    try {

        if (req.body.ip_address != undefined && req.body.ip_address > 0) {
            const country_id = process.env.country_id;
            var ip_address = req.body.ip_address;
            const token = req.headers.authorization.split(' ')[1]
            var user_id = 0;
            var token_error = 0;
            /* if (token != undefined) {

                jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
                    if (err) {
                        token_error = 1;
                    } else {
                        user_id = decoded.user_id;
                    }
                });
            }
            if (token_error == 1) {
                return 'invalid_token';
            } */

            //var user_id = req.body.user_id;

            if (typeof user_id != 'undefined' && user_id > 0) {
                where = "WHERE ct.user_id='" + user_id + "'";
                var update_user = `UPDATE  ourshopee_cart_tracking SET user_id = '${user_id}' WHERE ip_address = '${ip_address}' `;
                await db.runQuery(update_user);
            } else {
                where = "WHERE ct.ip_address= '" + ip_address + "' and rstatus = 1";
            }
            var query = `SELECT ct.track_id as cart_id, ct.product_id, ct.total_order, ct.add_date
                        FROM ourshopee_cart_tracking as ct 
                         ${where}`;
            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                result = result[0];
                const currentDateTime = await datetimeHelper.currentDateTime();
                var grand_total = 0;
                var outofstock = 0;
                var available_quantity = 0;
                var product_array = result.map((ele) => {
                    return ele.product_id
                });

                var cart_offer_product_query = `SELECT * FROM ourshopee_offer_products
                WHERE FIND_IN_SET(product_id,"${product_array.toString()}");                
                `;

                var cart_offer_product = await db.runQuery(cart_offer_product_query);


                var productList = await section_model.get_products_by_ids_elk(product_array);
                const final_array = await result.map(cart => Object.assign(cart, productList.find(product => product.id === cart.product_id)))

                var free_shipping = 0;
                var dealoftheday = 0;
                var minpur = 0;
                var deal_product_id = 0;
                var min_tempvalue = 0;



                const output = await Promise.all(final_array.map(async (Element, index) => {
                    var min_value = 0;
                    if (Element.quantity <= Element.total_order) {
                        available_quantity = Element.quantity;

                    }
                    if (Element.quantity <= 0) {
                        available_quantity = 0;
                        var outofstock = 1;
                    } else {
                        available_quantity = Element.quantity;

                    }
                    //Checking Promotiin Price
                    var current_date = moment(currentDateTime).unix();
                    var promotion_from = moment(Element.from_date).unix();
                    var promotion_to = moment(Element.to_date).unix();

                    if (current_date > promotion_from && current_date < promotion_to) {
                        offer_quantity = 1;
                        // var min_tempvalue = Element.promotion_price;
                        t = Element.promotion_price;
                        deal_product_id = 1;
                        min_tempvalue = Element['min_pur'];
                        dealoftheday = 1;
                    } else if (parseInt(Element.special_price) > 0) {
                        t = Element.special_price;
                    } else {
                        t = Element.price;
                        dealoftheday = 0;
                    }

                    if (current_date > promotion_from && current_date < promotion_to) {
                        dealoftheday = 1;
                    } else {
                        dealoftheday = 0;
                    }
                    if (Element.credit_card == 1) {
                        credcardOnly = 1;
                    }

                    if (Element['shipping_charge'] == 0) {
                        free_shipping = free_shipping + 1;
                         min_tempvalue = Element['min_pur'];
                    }

                    if (free_shipping > 0) {
                        var min_value = min_tempvalue;
                        if (min_value == 0) {
                            var min_value = 50;
                        }
                        else {
                            var min_value = min_tempvalue;
                        }
                    } else {
                        var min_value = min_tempvalue;
                    }

                    minpur = min_value;


                    var total = (Element.total_order * t).toFixed(2);
                    grand_total = parseFloat(grand_total) + parseFloat(total);

                    return {
                        cart_id: Element.cart_id,
                        name: Element.name,
                        url: Element.url,
                        product_id: Element.product_id,
                        quantity: Element.total_order,
                        single_price: t,
                        sku: Element.sku,
                        available_quantity: available_quantity,
                        outofstock: outofstock,
                        total: total,
                        image: Element.image.replace('/thump', ''),
                    }
                }));


                if (grand_total < minpur && deal_product_id == 0) {
                    var msg = `Minimum purchase amount should be AED ${minpur} & above`;
                } else if (grand_total < minpur && deal_product_id == 1) {
                    var msg = `Only one deal product is eligible per order and minimum purchase amount should be AED ${minpur}`;
                } else if (grand_total >= minpur && dealoftheday == 1) {
                    var msg = `Only one deal product is eligible per order and minimum purchase amount should be AED ${minpur}`;
                } else {
                    var msg = '';
                }
                const final_result = {
                    result: output,
                    grand_total: 'AED ' + addZeroes(grand_total),
                    msg: msg,
                }

                return final_result
            } else {
                return 'notfound';
            }
        } else {

            if (req.body.user_id == 0) {
                return 'notfound';
            }


            var where = "WHERE ct.user_id='" + req.body.user_id + "' and rstatus = '1'";
            var query = `SELECT ct.*
                        FROM ourshopee_cart_tracking as ct 
                         ${where}`;




            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                result = result[0];
                const currentDateTime = await datetimeHelper.currentDateTime();
                var grand_total = 0;
                var outofstock = 0;
                var available_quantity = 0;
                var product_array = result.map((ele) => {
                    return ele.product_id
                });

                var cart_offer_product_query = `SELECT * FROM ourshopee_offer_products
                WHERE FIND_IN_SET(product_id,"${product_array.toString()}");                
                `;

                var cart_offer_product = await db.runQuery(cart_offer_product_query);


                var productList = await section_model.get_products_by_ids_elk(product_array);
                const final_array = await result.map(cart => Object.assign(cart, productList.find(product => product.id === cart.product_id)))

                var free_shipping = 0;
                var dealoftheday = 0;
                var minpur = 0;
                var deal_product_id = 0;
                var min_tempvalue = 0;



                const output = await Promise.all(final_array.map(async (Element, index) => {
                    var min_value = 0;
                    if (Element.quantity <= Element.total_order) {
                        available_quantity = Element.quantity;

                    }
                    if (Element.quantity <= 0) {
                        available_quantity = 0;
                        var outofstock = 1;
                    } else {
                        available_quantity = Element.quantity;

                    }
                    //Checking Promotiin Price
                    var current_date = moment(currentDateTime).unix();
                    var promotion_from = moment(Element.from_date).unix();
                    var promotion_to = moment(Element.to_date).unix();

                    if (current_date > promotion_from && current_date < promotion_to) {
                        offer_quantity = 1;
                        t = Element.promotion_price;
                        deal_product_id = 1;
                        min_tempvalue = Element['min_pur'];
                        dealoftheday = 1;
                    } else if (parseInt(Element.special_price) > 0) {
                        t = Element.special_price;
                    } else {
                        t = Element.price;
                        dealoftheday = 0;
                    }

                    if (current_date > promotion_from && current_date < promotion_to) {
                        dealoftheday = 1;
                    } else {
                        dealoftheday = 0;
                    }
                    if (Element.credit_card == 1) {
                        credcardOnly = 1;
                    }

                    if (Element['shipping_charge'] == 0) {
                        free_shipping = free_shipping + 1;
                         min_tempvalue = Element['min_pur'];
                    }

                    if (free_shipping > 0) {
                        var min_value = min_tempvalue;
                        if (min_value == 0) {
                            var min_value = 50;
                        }
                        else {
                            var min_value = min_tempvalue;
                        }
                    } else {
                        var min_value = min_tempvalue;
                    }

                    minpur = min_value;

                    

                    var total = (Element.total_order * t).toFixed(2);
                    grand_total = parseFloat(grand_total) + parseFloat(total);

                    return {
                        cart_id: Element.track_id,
                        name: Element.name,
                        url: Element.url,
                        product_id: Element.product_id,
                        quantity: Element.total_order,
                        single_price: t,
                        sku: Element.sku,
                        available_quantity: available_quantity,
                        outofstock: outofstock,
                        total: total,
                        image: Element.image,
                    }
                }));

                if (grand_total < minpur && deal_product_id == 0) {
                    var msg = `Minimum purchase amount should be AED ${minpur} & above`;
                } else if (grand_total < minpur && deal_product_id == 1) {
                    var msg = `Only one deal product is eligible per order and minimum purchase amount should be AED ${minpur}`;
                } else if (grand_total >= minpur && dealoftheday == 1) {
                    var msg = `Only one deal product is eligible per order and minimum purchase amount should be AED ${minpur}`;
                } else {
                    var msg = '';
                }
                const final_result = {
                    result: output,
                    grand_total: 'AED ' + addZeroes(grand_total),
                    msg: msg,
                }

                return final_result
            } else {
                return 'notfound';
            }
        }

    } catch (err) {
        console.log(err);
        return 'error';
    }
}

// -------------------------------------------ok
const changeCartQuantity = async (req, res) => {

    try {

        if (typeof req.body.cart_id != 'undefined' && req.body.cart_id != '' && typeof req.body.quantity != 'undefined' && req.body.quantity != '') {

            var query = `SELECT track_id, product_id, total_order, ip_address FROM ourshopee_cart_tracking
        WHERE track_id='${req.body.cart_id}' `;
            var result = await db.runQuery(query);
            const currentDateTime = await datetimeHelper.currentDateTime();

            if (result[0].length > 0) {
                var productListFront = await section_model.get_products_by_ids_elk([result[0][0].product_id]);
                var dealoftheday = 0;
                // checking frontend items whether item os in dealoffer
                await Promise.all(productListFront.map(async (Element, index) => {
                    var current_date = moment(currentDateTime).unix();
                    var from_date = '0';
                    var to_date = '0';
                    if (Element.from_date != '0000-00-00 00:00:00') {
                        from_date = moment(Element.from_date).unix();
                    }
                    if (Element.to_date != '0000-00-00 00:00:00') {
                        to_date = moment(Element.to_date).unix();
                    }
                    if (current_date > from_date && current_date < to_date) {
                        dealoftheday = 1;
                    } else {
                        dealoftheday = 0
                    }
                }));

                if (dealoftheday == 0) {
                    var sql = `UPDATE  ourshopee_cart_tracking SET total_order = '${req.body.quantity}' WHERE track_id = '${req.body.cart_id}' `;
                    var response = await db.runQuery(sql);
                    if (response[0].changedRows == 1) {
                        return { cart_id: req.body.cart_id };
                    } else {
                        return 'error';
                    }
                } else {
                    return { cart_id: req.body.cart_id, msg: "Only one deal product is eligible per order." };
                }



            }






        } else {
            return 'error';
        }
    } catch (err) {
        return 'error';
    }
}

// ------------------------------------------- ok
const removeFromCart = async (req, res) => {

    try {

        if (typeof req.body.cart_id != 'undefined' && req.body.cart_id != '') {

            var sql = `update ourshopee_cart_tracking set rstatus = 0 WHERE track_id = '${req.body.cart_id}' `;
            var response = await db.runQuery(sql);
            if (response[0].affectedRows == 1) {
                return true;
            } else {
                return 'error';
            }
        } else {
            return 'error';
        }
    } catch (err) {
        return 'error';
    }
}
const updateCartStatus = async (req, res) => {
    // console.log("req.user.user_id",req.user);

    try {
            var sql = `update ourshopee_cart_tracking set rstatus = 2 WHERE user_id = '${req.user.user_id}' and rstatus = 1`;
            var response = await db.runQuery(sql);
            if (response[0].affectedRows == 1) {
                return true;
            } else {
                return 'error';
            }
    } catch (err) {
        console.log(err)
        return 'error';
    }
}

// -------------------------------------------
const getSubCategoryById = async (subcatId = '') => {

    try {

        if (typeof subcatId != 'undefined' && subcatId != '' && subcatId != 0) {

            var query = `SELECT tabby_type,cashew_type,tamara_type FROM ourshopee_subcategory WHERE id=${subcatId} `;
            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                return result[0][0];
            } else {
                return 'notfound';
            }
        } else {
            return 'error';
        }

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const getSectionProductById = async (where = '') => {

    try {

        if (typeof where.product_id != 'undefined' && where.product_id != '' && where.product_id != 0 && where.section_id != '' && where.section_id != 0) {

            var query = `SELECT * FROM ourshopee_section_products WHERE section_id=${where.section_id}  AND product_id=${where.product_id} `;
            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                return result[0];
            } else {
                return 'notfound';
            }
        } else {
            return 'error';
        }

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const getProcessingFees = async () => {

    try {

        var query = `SELECT processing_fee FROM ourshopee_paymentmethod WHERE status=1 and payment_type = 9 LIMIT 1 `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0][0].processing_fee;
        } else {
            return false;
        }


    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const getShippingChargeFromArea = async (areaID) => {

    try {

        var query = `SELECT shipping_charge FROM ourshopee_area WHERE id=${areaID} `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0][0].shipping_charge;
        } else {
            return false;
        }


    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const getUserDefaultAddress = async (loginId) => {

    try {        
        var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND default_address=1 LIMIT 1 `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0];
        } else {
            var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND default_address=0 LIMIT 1 `;
            var result = await db.runQuery(query);
            return result[0];
        }

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
// *************************************************
const getUserDefaultAddress_new = async (loginId) => {

    try {
        var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND select_address=1 LIMIT 1 `;
        var result = await db.runQuery(query);
        if (result[0].length > 0){
            return result [0];
        } else {
            var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND default_address=1 LIMIT 1 `;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0];
        } else {
            var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND default_address=0 LIMIT 1 `;
            var result = await db.runQuery(query);
            return result[0];
        }

        }       

    } catch (err) {
        return 'error';
    }
}




// *********************************************************
// -------------------------------------------------
const getDefaultAddress = async (req) => {

    try {  
        const loginId=req.user.user_id;      
        var query = `SELECT * FROM ourshopee_user_address WHERE user_id=${loginId} AND default_address=1 LIMIT 1 `;
        var result = await db.runQuery(query);
        if (result && result[0] && result[0].length > 0) {
            return result[0];
        } else {
            return false;
        }

    } catch (err) {
        return 'error';
    }
}


// -----------------------------------------------------------
const updateCartTrackingMuliple = async (req) => {

    try {
        var loginId = req.user.user_id;
        var sql = `UPDATE  ourshopee_cart_tracking SET action = 'checkout', user_id=${loginId}  WHERE track_id IN (?)`;
        await db.runQuery(sql, [req.update_cart]);
        return true;

    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------
const GetPlaceOrder = async (req) => {

    try {
        const currentDateTime = await datetimeHelper.currentDateTime();
        const country_id = process.env.country_id;
        var ip_address = req.query.ip_address;
        var loginId = req.user.user_id;
        var query = `SELECT ct.track_id as cart_id, ct.product_id, ct.total_order, ct.add_date, ct.action as traking_action
                        FROM ourshopee_cart_tracking as ct 
                        WHERE ct.user_id='${loginId}' and rstatus = 1`;

        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            var i = 0;
            var grand_total = 0;
            var sub_total = 0;
            var grand_weight = 0;
            var shipping_charge = 0;
            var offerProduct = 0;
            var free_shipping = 0;
            var clearence_count = 0;
            var clearencetotal = 0;
            var temp_count = 0;
            var credcardOnly = 0;
            var tabbyType = 0;
            var cashewType = 0;
            var tamaraType = 0;
            var freeshippingvalue = 0;
            var categoryId = 0;
            var weight_calculate = 0;
            var min_tempvalue = 0;
            var ext_war_per = 5;
            var min_value = 0;
            var update_cart = [];

            result = result[0];

            var product_array = result.map((ele) => {
                return ele.product_id
            });
            var productList = await section_model.get_products_by_ids_elk(product_array);
            const final_array = await result.map(cart => Object.assign(cart, productList.find(product => product.id === cart.product_id)))
            // looping -------------

            await Promise.all(final_array.map(async (Element, index) => {
                subcatId = Element.subcategory_id
                categoryId = Element.category_id

                var currentdate = moment(currentDateTime).unix();
                var from_date = '0';
                var to_date = '0';
                if (Element.from_date != '0000-00-00 00:00:00') {
                    from_date = moment(Element.from_date).unix();
                }
                if (Element.to_date != '0000-00-00 00:00:00') {
                    to_date = moment(Element.to_date).unix();
                }
                if (currentdate > from_date && currentdate < to_date) {
                    offerProduct = 1;
                }

                // cart only product----------
                /* if (Element.credit_card == 1) {
                    credcardOnly = 1;
                } */
                // update ourshopee_cart_tracking table checkout push array  -------------ok
                if (Element.traking_action.toLowerCase() == 'add') {
                    update_cart.push(Element.cart_id);
                }
                //Calculating tabby category AORB according to subcategort ----------------ok

                //Finding subcategory tabby type -----------
                const subcatData = await getSubCategoryById(subcatId);
                if (subcatData != 'error') {
                    if (subcatData.tabby_type == 1) {
                        tabbyType = 1;
                    }
                    if (subcatData.cashew_type == 1) {
                        cashewType = 1;
                    }
                    if (subcatData.tamara_type == 1) {
                        tamaraType = 1;
                    }

                }

                if (Element.quantity > 0 && Element.quantity <= Element.total_order) {
                    var qty = Element.quantity;
                } else {
                    var qty = Element.total_order;
                }
                if (Element.quantity <= 0) {
                    var qty = 0;
                }


                //Checking Promotiin Price
                var promotion_charge = 0;
                var promotion_from = moment(Element.from_date).unix();
                var promotion_to = moment(Element.to_date).unix();

                if (currentdate > promotion_from && currentdate < promotion_to) {
                    var t = Element.promotion_price;
                    promotion_charge++;
                } else if (parseInt(Element.special_price) > 0) {
                    var t = Element.special_price;
                } else {
                    var t = Element.price;
                }



                //Calculating temp2count and making minimum .
                var input_data = { section_id: 53, product_id: Element.id, offset: 0, limit: 1 }
                var temp_product = await section_model.get_products_by_section_elk(input_data);
                if (temp_product.length > 0) {
                    min_tempvalue = 0.00; // This dummey calculation 
                    temp_count++
                }

                //Calculating Clearence sale// if free shipping then increasing minimum purchase amount
                var input_data1 = { section_id: 51, product_id: Element.id, offset: 0, limit: 1 }
                var clearence_product = await section_model.get_products_by_section_elk(input_data1);
                if (clearence_product.length > 0) {
                    clearencetotal += t * Element.total_order;
                    clearence_count++;
                }
                var total = (qty * t);

                //Warranty price
                wprice = 0;
                totalwprice = 0;
                if (Element.warranty == 1) {
                    wprice = (t * ext_war_per) / 100;
                    totalwprice = parseFloat(qty * wprice);
                }

                //Assigning minimum purchase and minimum free shipping value.
                if (shipping_charge < Element.shipping_charge) {
                    shipping_charge = Element.shipping_charge;
                }

                if (Element.shipping_charge == 0) {
                    if (currentdate > promotion_from && currentdate < promotion_to) {
                        free_shipping++;
                        freeshippingvalue = 499.00;
                        min_tempvalue = 0.00; //this is dummey data
                        min_value = min_tempvalue;
                    }
                }
                //grand_total = parseFloat(grand_total) + parseFloat(total);


                sub_total = parseFloat(sub_total) + parseFloat(total) + parseFloat(totalwprice);
                return {
                    sub_total: sub_total
                }
            }));

            minpur = min_value;


            const processing_fee = await getProcessingFees();

            const userdefaultaddress = await getUserDefaultAddress(loginId);
            if (userdefaultaddress.length > 0) {
                areaID = userdefaultaddress[0].area
                const areaShipping = await getShippingChargeFromArea(areaID);
                if (areaShipping > 0 && shipping_charge >= 50) {
                    freesuvalue = freeshippingvalue;
                    shipping_charge = areaShipping;

                }
                else if (free_shipping > 0 && clearence_count > 0) {
                    freesuvalue = freeshippingvalue + clearencetotal
                    shipping_charge = 10;
                    if (sub_total > freesuvalue) {
                        freesuvalue = 0;
                        shipping_charge = 0;
                    }
                }
                else if (free_shipping > 0 && sub_total < freeshippingvalue) {
                    freesuvalue = freeshippingvalue;
                    shipping_charge = 10;
                }
                else if (sub_total >= freeshippingvalue && free_shipping > 0) {
                    shipping_charge = shipping_charge;
                    freesuvalue = freeshippingvalue;
                }
                else {
                    shipping_charge = shipping_charge;
                    freesuvalue = freeshippingvalue;
                }
            }

            total_value = sub_total;
            donation = 1;
            //Calculating Order total With Vat.
            grand_total = parseFloat(sub_total) + parseFloat(shipping_charge) + parseFloat(processing_fee);

            withvat = (grand_total * 5) / 105;
            //Removing vat amount
            final_total = grand_total;//1 for donation

            // Payment Method  section start here ----------------------start
            if (categoryId == 50 || (final_total < 1000 && credcardOnly == 0)) {
                if (final_total < 500) {
                    //processing = round(number_format(final_total*2/100,2));

                    var processing = Math.round(final_total * 2 / 100).toFixed(2);

                    if (final_total < 100) {
                        processing = 2;
                    }

                    var selected_processing = addZeroes(processing);
                } else {
                    var selected_processing = "10.00";
                }
            } else {
                var selected_processing = "";
            }

            const PaymentMethod = [
                ...(selected_processing != '' ? [{
                    "id": "payment_method",
                    "payment_method": "cash",
                    "label": "Cash On Delivery",
                    "sub_label": "Processing Fees:" + selected_processing + " AED",
                    "processing_fee": selected_processing,
                    "type": "cashondelivery",
                    "selected": false,
                }] : []),
                {
                    "id":"payment_method12",
                    "payment_method":"crypto_payment",
                    "label":"Crypto Currency",
                    "sub_label":"processing Fees: 0.00 AED",
                    "processing_fee": addZeroes(0),
                    "type":"cryptocurrency",
                    "selected":false,
                },
                {
                    "id": "payment_method10",
                    "payment_method": "PostPay",
                    "label": "Pay by Card",
                    "sub_label": "Processing Fees: 0.00 AED", // actual data= 0.00
                    "processing_fee": addZeroes(0),
                    "type": "paybycart",
                    "selected": true,
                },
                {
                    "id": "payment_method9",
                    "payment_method": "Tap",
                    "label": "Pay by Card",
                    "sub_label": "Processing Fees: 0.00 AED", // actual data= 0.00
                    "processing_fee": addZeroes(0),
                    "type": "paybycart",
                    "selected": true,
                },
            ]

            var tabbyactive = 0;
            if (final_total > 1500 && final_total <= 20000) {
                tabbyactive = 2;
            } else if (final_total < 1500) {
                tabbyactive = 1;
            }
            if (tabbyactive == 1) {
                PaymentMethod.push({
                    "id": "payment_method5",
                    "payment_method": "tabby",
                    "label": "TABBY - FREE INSTALLMENT  DEBIT CARD ACCEPTED",
                    "sub_label": "Processing Fees: 20.00 AED",
                    "processing_fee": addZeroes(20), // actual data= 20.00
                    "selected": false,
                    "type": "tabby_debit",
                    "image": process.env.images + "tabby-badge.png",
                })
            }
            else if (tabbyactive == 2) {
                PaymentMethod.push({
                    "id": "payment_method5",
                    "payment_method": "credit_payfort",
                    "label": "TABBY - FREE INSTALLMENTS FOR CARDS ",
                    "sub_label": "Processing Fees: 20.00 AED",
                    "processing_fee": addZeroes(20), // actual data= 20.00
                    "selected": false,
                    "type": "tabby_credit",
                    "image": process.env.images + "tamara/logo-tamara.svg",
                })
            }

            PaymentMethod.push({
                "id": "payment_method1",
                "payment_method": "credit_payfort",
                "label": "INSTALLMENT PLANS ONLY FOR CREDIT CARD",
                "sub_label": "Processing Fees: 20.00 AED",
                "processing_fee": addZeroes(20), // actual data= 20.00
                "selected": false,
                "type": "plan_credit",
                "easy_installments": "Easy Installments",
                "easy_installments_link": "easy-installment",
                "available_plane": [
                    {
                        "label": "Available when you spend AED 500 or above with",
                        "bank_offer_list": [
                            process.env.images + 'payfort-bank/ADCB.svg',
                            process.env.images + 'payfort-bank/FAB.svg',
                            process.env.images + 'payfort-bank/DUBAI-FIRST.svg',
                            process.env.images + 'payfort-bank/EMIRATES-ISLAMIC.svg',
                            process.env.images + 'payfort-bank/STANDARD-CHARTERED.svg',
                            process.env.images + 'payfort-bank/CBD.svg',
                        ]
                    },
                    {
                        "label": "Available when you spend AED 750 or above with",
                        "bank_offer_list": [
                            process.env.images + 'payfort-bank/NBD.svg',
                        ]
                    },
                    {
                        "label": " Available when you spend AED 1000 or above with",
                        "bank_offer_list": [
                            process.env.images + 'payfort-bank/MAWARID.svg',
                            process.env.images + 'payfort-bank/RAK-BANK.svg',
                            process.env.images + 'payfort-bank/DUBAI-FIRST.svg',
                            process.env.images + 'payfort-bank/EMIRATES-ISLAMIC.svg',
                            process.env.images + 'payfort-bank/STANDARD-CHARTERED.svg',
                            process.env.images + 'payfort-bank/CBD.svg',
                        ]
                    }
                ]
            })

            // Payment Method  section start end ----------------------end
            // upodate cart checkout --------------ok 
            if (update_cart.length > 0) {
                req.update_cart = update_cart
                await updateCartTrackingMuliple(req);
            }
            //checking clearence sale
            if (clearencetotal > 0 && free_shipping > 0) {
                minpur = clearencetotal + min_value;
            } else {
                minpur = min_value;
            }
            var minpur_error = '';
            var button_value = 'continue';
            if (sub_total < minpur) {
                minpur_error = 'Minimum purchase amount should be AED ' + minpur + ' & above';
                button_value = 'continue';
            } else {
                button_value = 'order';
            }
            const final_result = {
                sub_total: 'AED ' + addZeroes(sub_total),
                processing_fee: 'AED ' + addZeroes(processing_fee), // actual data= processing_fee 
                shipping_charge: 'AED ' + addZeroes(shipping_charge),
                donation: donation,
                final_total: 'AED ' + addZeroes(final_total),
                tabbyType: tabbyType,
                withvat: addZeroes(withvat),
                button_value: button_value,
                minpur_error: minpur_error,
                payment_method: PaymentMethod,
            }
            return final_result

        } else {
            return 'notfound';
        }


    } catch (err) {
        return 'error';
    }
}


// *********************************************************************
// ------------------------------------------- ok
const postPlaceOrder = async (req, res) => {
    try {

        var loginId = req.user.user_id;
        const currentDateTime = await datetimeHelper.currentDateTime();
            var donation_fee = req.body.donation_fee;
            var coupon_code = req.body.coupon_code;
            var notes = req.body.notes.replace(/\s/g, '');

            var payment_method = req.body.payment_method.replace(/\s/g, '');
            var pay_type = 0;
            var installment = 0;
            switch (payment_method) {
                case "credit_payfort":
                    pay_type = 1;
                    break;
                case "credit_network":
                    pay_type = 2;
                    break;
                case "credit_ccavenue":
                    pay_type = 3;
                    break;
                case "instalment":
                    pay_type = 4;
                    break;
                case "tabby":
                    pay_type = 5
                    break;
                case "cashew":
                    pay_type = 6
                    break;
                case "tamara":
                    pay_type = 7
                    break;
                case "Checkout":
                    pay_type = 8
                    break;
                case "Tap":
                    pay_type = 9
                    break;
                case "PostPay":
                    pay_type = 10
                    break;
                case "tabby-installment":
                    pay_type = 11
                    installment = 1;
                    break;
            }

            if (payment_method == 'cash') {
                rstatus = 'Pending';
            } else {
                rstatus = 'On Process';
                payment_method = 'credit';
            }
            const userdefaultaddress = await getUserDefaultAddress(loginId);


            var mobile = '';
            var username_address = '';
            var emirate = '';
            var area = '';
            var address = '';
            var address2 = '';
            var latitude = '';
            var longitude = ''
            var building_name = '';
            var city = '';
            var company = '';


            if (userdefaultaddress.length > 0) {
                mobile = userdefaultaddress[0].mobile;
                username_address = userdefaultaddress[0].name;
                emirate = userdefaultaddress[0].emirate;
                area = userdefaultaddress[0].area;
                address = userdefaultaddress[0].address.replace(/\s/g, '');
                address2 = userdefaultaddress[0].address2.replace(/\s/g, '');
                latitude = userdefaultaddress[0].latitude;
                longitude = userdefaultaddress[0].longitude;
                building_name = userdefaultaddress[0].building_name;
                city = userdefaultaddress[0].city;
                company = userdefaultaddress[0].company;

            }
            var vip_order = 0;
            const getMyProfile = await profile_model.getMyProfile(req);
            if (getMyProfile.length > 0) {
                user_email = getMyProfile[0].email;
                gender = getMyProfile[0].gender;
                nationality = getMyProfile[0].nationality;
                //checking vip customer
                if (getMyProfile[0].vip == 1) {
                    vip_order = 1;
                }
            }
            //calculating
            var or_id = 0;
            var query = `SELECT max(id) as max_id FROM ourshopee_orders`;
            var result_order = await db.runQuery(query);
            if (result_order[0].length > 0) {
                or_id = result_order[0][0].max_id;
            }

            const characters1 = 'ABCDEFGHIJKLMNO';
            const characters2 = 'PQRSTUVWXYZ';

            var or = or_id + 1;
            var r = Math.floor(100 + Math.random() * 1000);
            var aa = characters1.charAt(Math.floor(Math.random() * characters1.length));
            var aaa = characters2.charAt(Math.floor(Math.random() * characters2.length));

            order_id1 = or + aaa + r + aa;

            req.user_id = loginId;

            /* var or = or_id + 1;
            var r = Math.floor(100 + Math.random() * 1000);
            var aa = Math.floor(('A'.charCodeAt(0), 'O'.charCodeAt(0)) + Math.random() * 10);
            var aaa = Math.floor(('P'.charCodeAt(0), 'Z'.charCodeAt(0)) + Math.random() * 10); 

            order_id1 = or + String.fromCharCode(aaa) + r + String.fromCharCode(aa);*/

            const productAmount = await CalCulateOrdreAmount(req);

            var shipping_charge = productAmount.shipping_charge;
            var total_amount = productAmount.final_total;
            var processing_fee = req.body.processing_fee;
            var tabbyType = productAmount.tabbyType;
            var vat = productAmount.withvat;
            var discount = 0; // dummery
            var response = false;
            var sql = `INSERT INTO ourshopee_orders(user_id, name,company, email,mobile, emirate, area, address, address2, city, order_refid, order_date, shipping_charge, total_amount, paymode, status, discount, voucher, notes, processing_fee, vat, payment_type, latitude, longitude, building_name, gender, nationality, vip,installment, donation_fee)
            VALUES('${loginId}', '${username_address}','${company}', '${user_email}', '${mobile}', '${emirate}', '${area}', '${address}', '${address2}', '${city}', '${order_id1}', '${currentDateTime}', '${shipping_charge}', '${total_amount}', '${payment_method}', '${rstatus}', '${discount}' ,'${coupon_code}','${notes}', '${processing_fee}', '${vat}','${pay_type}', '${latitude}', '${longitude}', '${building_name}', '${gender}', '${nationality}', '${vip_order}', '${installment}','${donation_fee}' )`;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                var order_id = result[0].insertId;
                var sql1 = `INSERT INTO ourshopee_order_shipment(order_id, name,company, email,mobile, emirate, area, address, address2, city, order_refid)
               VALUES('${order_id}', '${username_address}','${company}', '${user_email}', '${mobile}', '${emirate}', '${area}', '${address}', '${address2}', '${city}', '${order_id1}')`;
                var result1 = await db.runQuery(sql1);
                if (result1[0].insertId != null) {
                    response = true;
                }
            }
            if (response) {
                const submitOrderData = [
                    {
                        'ip_address': 0,
                        'product_list': req.body.product_list,
                        'ourshopee_order_id': order_id,
                        'payment_method': payment_method,
                        'totalAmount': total_amount,
                        'tabbyType': tabbyType,
                    }

                ];

                return submitOrderData;

            } else {
                return 'error';
            }
        
    } catch (err) {
        console.log(err);
        return 'error';
    }
}


// -------------------------------------------------------------------------------------

// create or get auth token for crypto payment Triple A

const cryptoToken = async () => {
    let currentDateTime=moment.utc();
    const clientId="oacid-clvdqeej50qccz1is1gxh9cbt";
    clientSecret="d8bf5ee1c8d5671ef0e71fddcf0ca3c9a2f56b47e61e102e02552e8b7ce5aa84";

    try {
        const existingTokenQry=`SELECT * FROM ourshopee_crypto ORDER BY id DESC LIMIT 1`;
        const result1=await db.runQuery(existingTokenQry);
        if(result1 && result1[0].length>0){
            const oldtoken=result1[0][0].token;
            const oldexpirydate=moment(result1[0][0].expiry_date).format('YYYY-MM-DD HH:mm:ss');
            let currenttime=currentDateTime.format('YYYY-MM-DD HH:mm:ss');
            let oldDate=moment(oldexpirydate, 'YYYY-MM-DD HH:mm:ss')
            let currentdate=moment(currenttime, 'YYYY-MM-DD,HH:mm:ss')
            const differenceTime=oldDate.diff(currentdate,'seconds');
            if(differenceTime && differenceTime > 500){
                return oldtoken;
            }else{
                    const response=await axios.post("https://api.triple-a.io/api/v2/oauth/token",{
            grant_type:"client_credentials",
            client_id:clientId,
            client_secret:clientSecret,
            scope:"client-credentials"
        },{
            headers:{
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        },
        
    )
        const accessToken=response.data.access_token;
        const expiryTime=currentDateTime.clone().add(50,'minutes');
        const expirytime=expiryTime.format('YYYY-MM-DD HH:mm:ss');
        let sql=`INSERT INTO ourshopee_crypto (token, expiry_date) VALUES('${accessToken}','${expirytime}')`;
        let result=await db.runQuery(sql);
        if(result[0].affectedRows>0){
             return accessToken;
        }else{
            return "error"
        }
            }
        }
    
        
    } catch (error) {
        console.log(error);
        return "error";
    }
}







// ************************************************************************************************

// crypto payment hosted url api

const crypto_url=async(req)=>{
    const {crypto_token,order_id,total_amount,loginId} = req;
    const header={
        headers:{
            Authorization: `Bearer ${crypto_token}`,
            'Content-Type':'application/json'
        }
    }
    const params={
        "sandbox": true,
        "type": "widget",
        "merchant_key": "mkey-clvb3iyzn0000lzdjca1564t4",
        "order_currency": "AED",
        "order_amount": total_amount,
        "notify_email": "khurram0023200@gmail.com",
        "payer_id":loginId,
        "notify_url": "https://webhook.site/1a2d24e8-1594-4569-bc35-079049e4d805",
        "notify_secret": "1Cf9mx4nAvRuy5vwBY2FCtaKr",
        "notify_txs": true,
        "order_id": order_id,
        "success_url": `https://ourshopee.com/order/thanks/${order_id}`,
        "cancel_url": `https://ourshopee.com/order/thanks/${order_id}`,
    }
    try {
        const response=await axios.post("https://api.triple-a.io/api/v2/payment",params,header);
        const hosted_url=response.data && response.data.hosted_url;
        return hosted_url;
        
    } catch (error) {
        return "error"
    }
    
}
// ******************************************************************************
// this api is just copy the postplaceorder add only getDefaultAddress_new to add select address functionality;

// *******************************************************************

const postPlaceOrder_new = async (req, res) => {
    try {

        var loginId = req.user.user_id;
        const currentDateTime = await datetimeHelper.currentDateTime();
            var donation_fee = req.body.donation_fee;
            var coupon_code = req.body.coupon_code;
            var notes = req.body.notes.replace(/\s/g, '');

            var payment_method = req.body.payment_method.replace(/\s/g, '');
            var pay_type = 0;
            var installment = 0;
            switch (payment_method) {
                case "credit_payfort":
                    pay_type = 1;
                    break;
                case "credit_network":
                    pay_type = 2;
                    break;
                case "credit_ccavenue":
                    pay_type = 3;
                    break;
                case "instalment":
                    pay_type = 4;
                    break;
                case "tabby":
                    pay_type = 5
                    break;
                case "cashew":
                    pay_type = 6
                    break;
                case "tamara":
                    pay_type = 7
                    break;
                case "Checkout":
                    pay_type = 8
                    break;
                case "Tap":
                    pay_type = 9
                    break;
                case "PostPay":
                    pay_type = 10
                    break;
                case "tabby-installment":
                    pay_type = 11
                    installment = 1;
                    break;
                case "crypto_payment":
                    pay_type = 12
                    break;    
            }
            let crypto_token="";
            if (payment_method == 'cash') {
                rstatus = 'Pending';
            }else if(payment_method == 'crypto_payment'){
                crypto_token=await cryptoToken();
                payment_method = 'crypto_payment';
                rstatus = 'On Process';
            } else {
                rstatus = 'On Process';
                payment_method = 'credit';
            }
            

            const userdefaultaddress = await getUserDefaultAddress_new(loginId);


            var mobile = '';
            var username_address = '';
            var emirate = '';
            var area = '';
            var address = '';
            var address2 = '';
            var latitude = '';
            var longitude = ''
            var building_name = '';
            var city = '';
            var company = '';


            if (userdefaultaddress.length > 0) {
                mobile = userdefaultaddress[0].mobile;
                username_address = userdefaultaddress[0].name;
                emirate = userdefaultaddress[0].emirate;
                area = userdefaultaddress[0].area;
                address = userdefaultaddress[0].address.replace(/\s/g, '');
                address2 = userdefaultaddress[0].address2.replace(/\s/g, '');
                latitude = userdefaultaddress[0].latitude;
                longitude = userdefaultaddress[0].longitude;
                building_name = userdefaultaddress[0].building_name;
                city = userdefaultaddress[0].city;
                company = userdefaultaddress[0].company;

            }
            var vip_order = 0;
            const getMyProfile = await profile_model.getMyProfile(req);
            if (getMyProfile.length > 0) {
                user_email = getMyProfile[0].email;
                gender = getMyProfile[0].gender;
                nationality = getMyProfile[0].nationality;
                //checking vip customer
                if (getMyProfile[0].vip == 1) {
                    vip_order = 1;
                }
            }
            //calculating
            var or_id = 0;
            var query = `SELECT max(id) as max_id FROM ourshopee_orders`;
            var result_order = await db.runQuery(query);
            if (result_order[0].length > 0) {
                or_id = result_order[0][0].max_id;
            }

            const characters1 = 'ABCDEFGHIJKLMNO';
            const characters2 = 'PQRSTUVWXYZ';

            var or = or_id + 1;
            var r = Math.floor(100 + Math.random() * 1000);
            var aa = characters1.charAt(Math.floor(Math.random() * characters1.length));
            var aaa = characters2.charAt(Math.floor(Math.random() * characters2.length));

            order_id1 = or + aaa + r + aa;

            req.user_id = loginId;

            /* var or = or_id + 1;
            var r = Math.floor(100 + Math.random() * 1000);
            var aa = Math.floor(('A'.charCodeAt(0), 'O'.charCodeAt(0)) + Math.random() * 10);
            var aaa = Math.floor(('P'.charCodeAt(0), 'Z'.charCodeAt(0)) + Math.random() * 10); 

            order_id1 = or + String.fromCharCode(aaa) + r + String.fromCharCode(aa);*/

            const productAmount = await CalCulateOrdreAmount(req);

            var shipping_charge = productAmount.shipping_charge;
            var total_amount = productAmount.final_total;
            var processing_fee = req.body.processing_fee;
            var tabbyType = productAmount.tabbyType;
            var vat = productAmount.withvat;
            var discount = 0; // dummery
            var response = false;
            var sql = `INSERT INTO ourshopee_orders(user_id, name,company, email,mobile, emirate, area, address, address2, city, order_refid, order_date, shipping_charge, total_amount, paymode, status, discount, voucher, notes, processing_fee, vat, payment_type, latitude, longitude, building_name, gender, nationality, vip,installment, donation_fee)
            VALUES('${loginId}', '${username_address}','${company}', '${user_email}', '${mobile}', '${emirate}', '${area}', '${address}', '${address2}', '${city}', '${order_id1}', '${currentDateTime}', '${shipping_charge}', '${total_amount}', '${payment_method}', '${rstatus}', '${discount}' ,'${coupon_code}','${notes}', '${processing_fee}', '${vat}','${pay_type}', '${latitude}', '${longitude}', '${building_name}', '${gender}', '${nationality}', '${vip_order}', '${installment}','${donation_fee}' )`;
            var result = await db.runQuery(sql);
            if (result[0].insertId != null) {
                var order_id = result[0].insertId;
                var sql1 = `INSERT INTO ourshopee_order_shipment(order_id, name,company, email,mobile, emirate, area, address, address2, city, order_refid)
               VALUES('${order_id}', '${username_address}','${company}', '${user_email}', '${mobile}', '${emirate}', '${area}', '${address}', '${address2}', '${city}', '${order_id1}')`;
                var result1 = await db.runQuery(sql1);
                if (result1[0].insertId != null) {
                    response = true;
                }
            }
            
            if (response) {
                let hostedurl="";
                if(crypto_token && crypto_token !== ""){
                    hostedurl=await crypto_url({crypto_token,order_id,total_amount,loginId});
                    
                }
                const submitOrderData = [
                    {
                        'ip_address': 0,
                        'product_list': req.body.product_list,
                        'ourshopee_order_id': order_id,
                        'payment_method': payment_method,
                        'totalAmount': total_amount,
                        'tabbyType': tabbyType,
                        'hostedurl': hostedurl,
                        
                    }

                ];

                return submitOrderData;

            } else {
                return 'error';
            }
        
    } catch (err) {
        console.log(err);
        return 'error';
    }
}


// *******************************************************************************
// -------------------------------------------------------------------------------------

// calculate  order amount of user -------------------------
const CalCulateOrdreAmount = async (req, res) => {

    const currentDateTime = await datetimeHelper.currentDateTime();
    // var ip_address = req.ip_address;
    var loginId = req.user_id;
    var query = `SELECT ct.track_id as cart_id, ct.product_id, ct.total_order, ct.add_date, ct.action as traking_action
                FROM ourshopee_cart_tracking as ct 
                WHERE user_id=${loginId} and rstatus = 1`;

    var result = await db.runQuery(query);
    if (result[0].length > 0) {
        var i = 0;
        var grand_total = 0;
        var sub_total = 0;
        var grand_weight = 0;
        var shipping_charge = 0;
        var offerProduct = 0;
        var free_shipping = 0;
        var clearence_count = 0;
        var clearencetotal = 0;
        var temp_count = 0;
        var credcardOnly = 0;
        var tabbyType = 0;
        var cashewType = 0;
        var tamaraType = 0;
        var freeshippingvalue = 0;
        var categoryId = 0;
        var weight_calculate = 0;
        var min_tempvalue = 0;
        var ext_war_per = 5;
        var min_value = 0;
        var update_cart = [];

        result = result[0];

        var product_array = result.map((ele) => {
            return ele.product_id
        });
        //  console.log('product_array', product_array);

        var productList = await section_model.get_products_by_ids_elk(product_array);
        const final_array = await result.map(cart => Object.assign(cart, productList.find(product => product.id === cart.product_id)))
        // looping -------------
        await Promise.all(final_array.map(async (Element, index) => {

            subcatId = Element.subcategory_id
            categoryId = Element.category_id

            var currentdate = moment(currentDateTime).unix();
            var from_date = '0';
            var to_date = '0';
            if (Element.from_date != '0000-00-00 00:00:00') {
                from_date = moment(Element.from_date).unix();
            }
            if (Element.to_date != '0000-00-00 00:00:00') {
                to_date = moment(Element.to_date).unix();
            }
            if (currentdate > from_date && currentdate < to_date) {
                offerProduct = 1;
            }

            //Finding subcategory tabby type -----------
            const subcatData = await getSubCategoryById(subcatId);
            if (subcatData != 'error') {
                if (subcatData.tabby_type == 1) {
                    tabbyType = 1;
                }
                if (subcatData.cashew_type == 1) {
                    cashewType = 1;
                }
                if (subcatData.tamara_type == 1) {
                    tamaraType = 1;
                }

            }

            var qty = 0;
            if (Element.quantity > 0 && Element.quantity <= Element.total_order) {
                qty = Element.quantity;
            } else {
                qty = Element.total_order;
            }
            if (Element.quantity <= 0) {
                qty = 0;
            }


            //Checking Promotiin Price
            var promotion_charge = 0;
            var promotion_from = moment(Element.from_date).unix();
            var promotion_to = moment(Element.to_date).unix();

            var t = 0;

            if (currentdate > promotion_from && currentdate < promotion_to) {
                t = Element.promotion_price;
                //promotion_charge++;
            } else if (parseInt(Element.special_price) > 0) {
                t = Element.special_price;
            } else {
                t = Element.price;
            }

            //Calculating temp2count and making minimum .
            var input_data = { section_id: 53, product_id: Element.id, offset: 0, limit: 1 }
            var temp_product = await section_model.get_products_by_section_elk(input_data);
            if (temp_product.length > 0) {
                min_tempvalue = 0.00; // This dummey calculation 
                temp_count++
            }

            //Calculating Clearence sale// if free shipping then increasing minimum purchase amount
            var input_data1 = { section_id: 51, product_id: Element.id, offset: 0, limit: 1 }
            var clearence_product = await section_model.get_products_by_section_elk(input_data1);
            if (clearence_product.length > 0) {
                clearencetotal += t * Element.total_order;
                clearence_count++;
            }
            // console.log('qty', qty);
            // console.log('price', t);
            var total = (qty * t);
            //Warranty price
            wprice = 0;
            totalwprice = 0;
            if (Element.warranty == 1) {
                wprice = (t * ext_war_per) / 100;
                totalwprice = parseFloat(qty * wprice);
            }

            //Assigning minimum purchase and minimum free shipping value.
            if (shipping_charge < Element.shipping_charge) {
                shipping_charge = Element.shipping_charge;
            }

            if (Element.shipping_charge == 0) {
                if (currentdate > promotion_from && currentdate < promotion_to) {
                    free_shipping++;
                    freeshippingvalue = 499.00;
                    min_tempvalue = 0.00; //this is dummey data
                    min_value = min_tempvalue;
                }
            }
            //grand_total = parseFloat(grand_total) + parseFloat(total);


            sub_total = parseFloat(sub_total) + parseFloat(total) + parseFloat(totalwprice);
            return {
                sub_total: sub_total
            }
        }));

        minpur = min_value;


        const processing_fee = await getProcessingFees();

        const userdefaultaddress = await getUserDefaultAddress(loginId);
        if (userdefaultaddress.length > 0) {
            areaID = userdefaultaddress[0].area
            const areaShipping = await getShippingChargeFromArea(areaID);
            if (areaShipping > 0 && shipping_charge >= 50) {
                freesuvalue = freeshippingvalue;
                shipping_charge = areaShipping;

            }
            else if (free_shipping > 0 && clearence_count > 0) {
                freesuvalue = freeshippingvalue + clearencetotal
                shipping_charge = 10;
                if (sub_total > freesuvalue) {
                    freesuvalue = 0;
                    shipping_charge = 0;
                }
            }
            else if (free_shipping > 0 && sub_total < freeshippingvalue) {
                freesuvalue = freeshippingvalue;
                shipping_charge = 10;
            }
            else if (sub_total >= freeshippingvalue && free_shipping > 0) {
                shipping_charge = shipping_charge;
                freesuvalue = freeshippingvalue;
            }
            else {
                shipping_charge = shipping_charge;
                freesuvalue = freeshippingvalue;
            }
        }

        total_value = sub_total;
        donation = 1;
        //Calculating Order total With Vat.
        grand_total = parseFloat(sub_total) + parseFloat(shipping_charge) + parseFloat(req.body.processing_fee);

        withvat = (grand_total * 5) / 100;
        //Removing vat amount
        final_total = grand_total + donation;//1 for donation

        // Payment Method  section start here ----------------------start
        if (categoryId == 50 || (final_total < 1000 && credcardOnly == 0)) {
            if (final_total < 500) {
                //processing = round(number_format(final_total*2/100,2));

                var processing = Math.round(final_total * 2 / 100).toFixed(2);

                if (final_total < 100) {
                    processing = 2;
                }

                var selected_processing = addZeroes(processing);
            } else {
                var selected_processing = "10.00";

            }
        }
        const final_result = {
            sub_total: addZeroes(sub_total),
            processing_fee: addZeroes(processing_fee), // actual data= processing_fee 
            shipping_charge: addZeroes(shipping_charge),
            donation: addZeroes(donation),
            final_total: addZeroes(final_total),
            tabbyType: tabbyType,
            withvat: addZeroes(withvat),
        }

        // console.log('final_result', final_result);
        return final_result
    }
}



// -------------------------------------------------------------------------

// submit Order -------------------------------------
const SubmitOrder = async (data) => {
    const currentDateTime = await datetimeHelper.currentDateTime();
    var tabbyType = data.tabbyType;
    var order_id = data.ourshopee_order_id;
    var payment_method = data.payment_method;
    /* if(!order_id || ! ip_address){
        return false;
    } */

    req.query.order_id = order_id;
    const orderDetails = await getOrderDetailsById(req);


}

const getOrderDetailsById = async (req) => {

    try {
        if (typeof req.query.order_id != 'undefined' && req.query.order_id > 0) {
            order_id = req.query.order_id;

            var query = `SELECT * FROM ourshopee_orders WHERE id=${order_id}`;
            var result = await db.runQuery(query);
            if (result[0].length > 0) {
                return result[0][0];
            } else {
                return false;
            }
        } else {
            return 'error';
        }
    } catch (err) {
        return 'error';
    }
}




// add zero in amount  function ---------------------------------------ok
function addZeroes(num) {
    return num.toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2 })
}


module.exports = {
    AddToCart: AddToCart,
    GetFromCart: GetFromCart,
    changeCartQuantity: changeCartQuantity,
    removeFromCart: removeFromCart,
    GetPlaceOrder: GetPlaceOrder,
    updateCartStatus:updateCartStatus,
    postPlaceOrder: postPlaceOrder,
    getUserDefaultAddress: getDefaultAddress,
    postPlaceOrder_new: postPlaceOrder_new,
}