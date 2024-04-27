const db = require('../../db');
const config = require('../../config');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const sendemailerr = require('../../helpers/email').emailerr;
const moment = require('moment');
const section_model = require('../section/model');
const profile_model = require('../profile/model');
const product_model = require('../products/model');
const { async } = require('q');

// -------------------------------------------

const productDetails = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 1000,
            "_source": ["id", "image", "name"],
            "query": {
                "bool": {
                    "must": [
                        { "terms": { "id": req } }
                    ]
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

const myOrders = async (req) => {

    try {
        const offset = (req.query.page == '1' ? 0 : ((req.query.page - 1) * 10))

        var query = `SELECT o.id as order_id, o.order_refid, o.name as user_name,o.mobile, o.paymode, o.total_amount, o.shipping_charge, o.processing_fee, o.vat, 

            o.discount, o.order_date, o.total_amount, o.status as order_status, o.address as shipping_address 

            FROM ourshopee_orders o 

            WHERE o.user_id = ${req.user.user_id} and o.status != 'On Process' and o.country_id = 1 ORDER BY o.id DESC limit ${offset}, 10`;

        var result = await db.runQuery(query);

        if (result[0].length > 0) {

            var secondquery = `SELECT so.refid, so.id as s_id, so.orderid as shopee_orderid, so.status as shopee_status,so.despatch_date as shopee_despatch_date, 

                so.delivery_date as shopee_delivery_date, so.order_date as shopee_order_date, so.cancel_date as shopee_cancel_date    

                FROM shopee_orders so 

                WHERE FIND_IN_SET(refid,"${result[0].map(object => object.order_refid).toString()}");
                
                SELECT op.order_id, op.product_id, op.price, op.quantity, p.name, p.image
 
					FROM ourshopee_order_products op  

                    LEFT JOIN ourshopee_products p ON p.id = op.product_id 

					WHERE FIND_IN_SET (op.order_id,"${result[0].map(object => object.order_id).toString()}");
                
                    SELECT wo.refno, wo.status as web_status, wo.cancel_date as web_cancel_date FROM shopee_weborders wo WHERE FIND_IN_SET(wo.refno,"${result[0].map(object => object.order_refid).toString()}");
                
                    SELECT so.refid, ssd.sender_id, date(ssd.date) as shipping_date, ssd.accept_date as accept_date, ssd.received , sdt.name as delivery_name, sdt.contact as delivery_contact,

					ssd.status as sender_status, date(ssd.cdelivery_date) as customer_delivery_date, date(ssd.return_date) as return_date

					FROM shopee_orders so 

					LEFT JOIN shopee_senderdetails ssd ON ssd.order_id = so.id 

					LEFT JOIN shopee_deliveryteam sdt ON sdt.id = ssd.sender_id 

                    WHERE FIND_IN_SET(so.refid,"${result[0].map(object => object.order_refid).toString()}");
                    `
            var secondresult = await db.runQuery(secondquery);
            return result[0].map(ele => {
                var ordered_date = moment(ele.order_date).format('dddd').substring(0, 3) + ", " + moment(ele.order_date).format('MMMM').substring(0, 3) + " " + moment(ele.order_date).format('DD');
                var packed_date = moment(ordered_date).add(2, 'days').format('dddd').substring(0, 3) + ", " + moment(ordered_date).add(2, 'days').format('MMMM').substring(0, 3) + " " + moment(ordered_date).add(2, 'days').format('DD');
                var dispatched_date = moment(packed_date).add(1, 'days').format('dddd').substring(0, 3) + ", " + moment(packed_date).add(1, 'days').format('MMMM').substring(0, 3) + " " + moment(packed_date).add(1, 'days').format('DD');
                var delivery_date = moment(dispatched_date).add(2, 'days').format('dddd').substring(0, 3) + ", " + moment(dispatched_date).add(2, 'days').format('MMMM').substring(0, 3) + " " + moment(dispatched_date).add(2, 'days').format('DD');

                var web_order_list = secondresult[0][2].filter(eleo => eleo.refno == ele.order_refid)[0];
                var shopee_list = secondresult[0][0].filter(eleo => eleo.refid == ele.order_refid);
                var sender_list = secondresult[0][3].filter(eleo => eleo.refid == ele.order_refid);

                var process_date_over = false;
                var pack_date_over = false;
                var dispatch_date_over = false;

                var cancelledFlag = false;


                if (web_order_list != undefined) {
                    if (web_order_list.web_status == 'Cancelled' || shopee_list.length > 0 && shopee_list[0].shopee_status == 'Cancelled' || ele.order_status != 'Pending') {
                        var cancelledFlag = true;
                    } else {
                        var cancelledFlag = false;
                    }
                    if (web_order_list.web_status == 'Cancelled') {
                        var cancelledDate = web_order_list.web_cancel_date;
                    }
                }

                if (shopee_list.length > 0) {
                    if (shopee_list[0]['shopee_status'] == 'Pending') {
                        var process_date_over = true;
                    }
                    if (shopee_list[0]['shopee_despatch_date'] != 'Invalid Date') {
                        var pack_date_over = true;
                        var process_date_over = true;
                    }
                    if (sender_list[0]['accept_date'] != null) {
                        var dispatch_date_over = true;
                    }
                    if (shopee_list[0].shopee_status == 'Cancelled') {
                        var cancelledFlag = true;
                        var cancelledDate = shopee_list[0].shopee_cancel_date;
                    }
                    if (sender_list[0]['sender_status'] == 'Delivered' || sender_list[0]['sender_status'] == 'Done') {
                        var delivery_date_over = true;
                    } else {
                        var delivery_date_over = false;
                    }
                    if (shopee_list[0]['shopee_status'] == 'Delivered' || sender_list[0]['sender_status'] == 'Delivered') {
                        var invoiceLink = `https://www.ourshopee.com/customer-invoice.php?order_id=${shopee_list[0]['shopee_orderid']}&refid=${ele.order_refid}`
                    }
                }

                return {
                    referenceNo: ele.order_refid,
                    orderId: secondresult[0][0].filter(ele1 => ele1.refid == ele.order_refid).map(rty => rty.shopee_orderid)[0],
                    totalAmount: ele.total_amount,
                    placedOn: moment(ele.order_date).format('YYYY-MM-DD HH:mm:ss'),
                    items: secondresult[0][1].filter(ele1 => ele1.order_id == ele.order_id).map(elet => {
                        return {
                            name: elet.name,
                            image: process.env.product_image_path + elet.image,
                            product_id: elet.product_id,
                            price: elet.price,
                            quantity: elet.quantity,
                        }
                    }),
                    cancelled: cancelledFlag,
                    ...(cancelledFlag == true && { cancelledText: ele.order_status != 'Pending' ? 'Due to online transaction error, your item has been cancelled' : 'As per your request, your item has been cancelled' }),
                    ...(cancelledFlag == true && { cancelledDate: cancelledDate }),
                    processDateOver: process_date_over,
                    packDateOver: pack_date_over,
                    dispatchDateOver: dispatch_date_over,
                    deliverydateOver: delivery_date_over,
                    invoice: invoiceLink,
                    orderDetail:
                    {
                        ...result[0].filter(eleo => eleo.order_refid == ele.order_refid)[0],
                        orderedDate: ordered_date,
                        processedDate: ordered_date,
                        packedDate: packed_date,
                        dispatchedDate: dispatched_date,
                        deliveryDate: delivery_date,

                    }
                }
            });
        } else {
            return []
        }
    } catch (err) {
        return 'error';
    }
}

const checkCouponCode = async (req) => {
    try {

        var coupon = req.body.coupon;

        var tamount = req.body.tamount;

        var now = new Date();

        var dateStringWithTime = moment().tz('Asia/Dubai').format('Y-M-D H:mm:ss');

        var user_id = req.user.user_id;

        var query = `SELECT * FROM ourshopee_register WHERE id = ${user_id}`;

        var userdetails = await db.runQuery(query);

        var mobile_no = userdetails[0][0].mobile

        var query1 = `SELECT a.* from ourshopee_promotioncode a WHERE a.promotion_code='${coupon}' and a.from < '${dateStringWithTime}' AND a.to > '${dateStringWithTime}' and country_id = 1 and (platform = 0 OR platform = 2)`;

        var couponDetails = await db.runQuery(query1);

        couponDetails = couponDetails[0];

        if (couponDetails.length > 0) {
            var promotiontype = couponDetails[0]['promotion_type'];

            var gamount = couponDetails[0]['amount_limit'];

            var couponvalue = couponDetails[0]['value'];

            var max_use = couponDetails[0]['max_use'];
        } else {
            var promotiontype = '';

            var gamount = 0;

            var couponvalue = 0;

            var max_use = 0;
        }

        var query2 = `SELECT * FROM ourshopee_register WHERE promotion_code = '${coupon}'`;

        var userfind = await db.runQuery(query2);

        userfind = userfind[0]

        if (userfind.length > 0 && (userfind[0]['promotion_code'] != "" && promotiontype != 6)) {

            promotiontype = 2;

        }

        if (couponDetails.length > 0) {
            if (gamount.length > 0 && gamount == "") {

                var query = `SELECT * FROM ourshopee_register WHERE id = ${promotiontype}`;

                var type_limit = await db.runQuery(query);

                var gamount = type_limit['amount_limit'];

            }
        }



        var msg = '';

        var discount = '';

        //Checking weather offer product are in cart

        if (req.body.offer > 0 && req.body.tamount < 200) {
            msg = 'To Redeem Voucher code on Offer products, Minimum purchase amount should be AED 200 or Above !';
        } else {

            const products_DATA = await product_model.previously_viewed(req);

            if (couponDetails.length > 0 && ((couponDetails[0]['promotion_code'] != "") || (userfind['promotion_code'] != ""))) {
                couponDetails = couponDetails[0];

                if (promotiontype == 4 && couponDetails['user_id'] != user_id && couponDetails['user_id'] != 0) {

                    msg = "Invalid Coupon Code.";

                } else if ((promotiontype == 3) && ((couponDetails['mobile_no'].trim()) != mobile_no.trim()) && (couponDetails['user_id'] == 0)) {

                    msg = "Invalid Coupon Code.";

                } else if ((promotiontype == 4) && ((couponDetails['mobile_no'].trim()) != mobile_no.trim()) && (couponDetails['user_id'] == 0)) {

                    msg = "Invalid Coupon Code";

                } else if (promotiontype == 6 && tamount >= gamount) {

                    var query = `SELECT id FROM ourshopee_userpromotioncode WHERE 1 and to_user='${user_id}' and promotion_code='${coupon}' and promotion_type = '${promotiontype}'`;

                    var search_result = await db.runQuery(query);

                    var total_used = search_result[0].length;

                    if (total_used >= max_use) {

                        msg = 'You already used this coupon code.';

                    } else {

                        discount = couponvalue / max_use;

                    }



                } else {

                    var query = `SELECT * FROM ourshopee_userpromotioncode WHERE 1 and to_user=${user_id} and promotion_code='${coupon}'`;

                    var check2 = await db.runQuery(query);

                    if (tamount < gamount && promotiontype != 3) {

                        msg = `Voucher code valid only on purchase of AED ${gamount} or above.`;

                    } else if (check2[0]['id'] > 0) {
                        msg = "You already used this coupon code";


                    } else if (promotiontype == 5 && tamount > gamount) {

                        var amountOfDiscount = 0;

                        var query = `SELECT * FROM ourshopee_promotioncode a WHERE a.promotion_code = '${coupon}' and a.to > '${dateStringWithTime}'`;

                        var promotion_data = await db.runQuery(query);

                        promotion_data = promotion_data[0];


                        products_DATA.map(product => {

                            var current_date = moment(dateStringWithTime).unix();

                            var promotion_from = moment(product.from_date).unix();

                            var promotion_to = moment(product.to_date).unix();

                            if (current_date > promotion_from && current_date < promotion_to) {
                                var t = product['promotion_price'];

                            } else if (product['special_price'] > 0) {

                                var t = product['special_price'];

                            } else {

                                var t = product['price'];

                            }

                            if (promotion_data[0]['check_brand'] == 0) {
                                const brandarray = promotion_data[0]['brand_id'].split('$');

                                for (let i = 0; i < brandarray.length; i++) {
                                    const per_brands = brandarray[i];

                                    if (product['brand_id'] == per_brands) {
                                        amountOfDiscount += t * 1;
                                    }
                                }
                            } else {

                                const brandarray = promotion_data[0]['brand_id'].split('$');

                                for (let b = 0; b < brandarray.length; b++) {
                                    const per_brands = brandarray[b];

                                    amountOfDiscount += t * 2;
                                }



                            }
                        })

                        discount = (couponDetails['percentage'] / 100) * amountOfDiscount;

                        var upto = couponDetails['upto'];

                        if (discount > upto) {

                            discount = upto;

                        }



                        //SUBSUB CATEGORY COUPEN CODE	

                    } else if (promotiontype == 9 && tamount > gamount) {
                        var amountOfDiscount = 0;


                        var query = `SELECT * FROM ourshopee_promotioncode a WHERE a.promotion_code = '${coupon}' and a.to > '${dateStringWithTime}'`;

                        var promotion_data = await db.runQuery(query);

                        promotion_data = promotion_data[0];

                        products_DATA.map(product => {

                            var current_date = moment(dateStringWithTime).unix();

                            var promotion_from = moment(product.from_date).unix();

                            var promotion_to = moment(product.to_date).unix();

                            if (current_date > promotion_from && current_date < promotion_to) {
                                var t = product['promotion_price'];

                            } else if (product['special_price'] > 0) {

                                var t = product['special_price'];

                            } else {

                                var t = product['price'];

                            }

                            const catarray = promotion_data[0]['category_id'].split('$');

                            for (let b = 0; b < catarray.length; b++) {
                                const per_brands = catarray[b];

                                if (per_brands === product['sub_subcategory_id']) {
                                    amountOfDiscount += t * 2;
                                }
                            }


                        })

                        discount = (couponDetails['percentage'] / 100) * amountOfDiscount;

                        var upto = couponDetails['upto'];

                        if (discount > upto) {

                            discount = upto;

                        }




                        // SUB CATEGORY COUPEN CODE

                    } else if (promotiontype == 8 && tamount > gamount) {

                        var amountOfDiscount = 0;


                        var query = `SELECT * FROM ourshopee_promotioncode a WHERE a.promotion_code = '${coupon}' and a.to > '${dateStringWithTime}'`;

                        var promotion_data = await db.runQuery(query);

                        promotion_data = promotion_data[0];

                        products_DATA.map(product => {

                            var current_date = moment(dateStringWithTime).unix();

                            var promotion_from = moment(product.from_date).unix();

                            var promotion_to = moment(product.to_date).unix();

                            if (current_date > promotion_from && current_date < promotion_to) {
                                var t = product['promotion_price'];

                            } else if (product['special_price'] > 0) {

                                var t = product['special_price'];

                            } else {

                                var t = product['price'];

                            }

                            const catarray = promotion_data[0]['category_id'].split('$');

                            for (let b = 0; b < catarray.length; b++) {
                                const per_brands = catarray[b];

                                if (per_brands === product['subcategory_id']) {
                                    amountOfDiscount += t * 2;
                                }
                            }

                        })

                        discount = (couponDetails['percentage'] / 100) * amountOfDiscount;

                        var upto = couponDetails['upto'];

                        if (discount > upto) {

                            discount = upto;

                        }


                        //CATEGORY COUPEN CODE	

                    } else if (promotiontype == 7 && tamount > gamount) {


                        var amountOfDiscount = 0;

                        var query = `SELECT * FROM ourshopee_promotioncode a WHERE a.promotion_code = '${coupon}' and a.to > '${dateStringWithTime}'`;

                        var promotion_data = await db.runQuery(query);

                        promotion_data = promotion_data[0];

                        products_DATA.map(product => {

                            var current_date = moment(dateStringWithTime).unix();

                            var promotion_from = moment(product.from_date).unix();

                            var promotion_to = moment(product.to_date).unix();

                            if (current_date > promotion_from && current_date < promotion_to) {
                                var t = product['promotion_price'];

                            } else if (product['special_price'] > 0) {

                                var t = product['special_price'];

                            } else {

                                var t = product['price'];

                            }

                            const catarray = promotion_data[0]['category_id'].split('$');

                            for (let b = 0; b < catarray.length; b++) {
                                const per_brands = catarray[b];

                                if (per_brands == product['category_id']) {
                                    amountOfDiscount += t * 2;
                                }
                            }
                        })

                        discount = (couponDetails['percentage'] / 100) * amountOfDiscount;

                        var upto = couponDetails['upto'];

                        if (discount > upto) {

                            discount = upto;

                        }

                        //SUB CATEGORY BRAND COUPEN CODE	

                    } else if (promotiontype == 10 && tamount > gamount) {

                        var amountOfDiscount = 0;

                        var query = `SELECT * FROM ourshopee_promotioncode a WHERE a.promotion_code = '${coupon}' and a.to > '${dateStringWithTime}'`;

                        var promotion_data = await db.runQuery(query);

                        promotion_data = promotion_data[0];

                        products_DATA.map(product => {

                            var current_date = moment(dateStringWithTime).unix();

                            var promotion_from = moment(product.from_date).unix();

                            var promotion_to = moment(product.to_date).unix();

                            if (current_date > promotion_from && current_date < promotion_to) {
                                var t = product['promotion_price'];

                            } else if (product['special_price'] > 0) {

                                var t = product['special_price'];

                            } else {

                                var t = product['price'];

                            }

                            if (product['subcategory_id'] == promotion_data[0]['category_id']) {
                                const catarray = promotion_data[0]['brand_id'].split('$');

                                for (let b = 0; b < catarray.length; b++) {
                                    const per_brands = catarray[b];

                                    if (per_brands == product['brand_id']) {
                                        amountOfDiscount += t * 2;
                                    }
                                }
                            }

                        })

                        discount = (couponDetails['percentage'] / 100) * amountOfDiscount;

                        var upto = couponDetails['upto'];

                        if (discount > upto) {

                            discount = upto;

                        }

                    } else {

                        //Calculating coupen value

                        //	$cond = " `userpromotion_code`='$coupen'";

                        //	$points_row = $operation->getdata_1('ourshopee_userpromotioncode','*','','',$cond);

                        //	$points = $points_row['points']; 

                        //	



                        var query = `SELECT * FROM ourshopee_pointvalue`;

                        var pvalue = await db.runQuery(query);

                        pvalue = pvalue[0][0];


                        var value = pvalue['point_value'];

                        if (couponDetails['promotion_code'] != "") {

                            discount = couponDetails['value'] / value;

                            var ptype = couponDetails['promotion_type'];

                        }

                        if (userfind['promotion_code'] != '') {

                            discount = 1000 / value;

                            var ptype = 2;

                        }




                    }
                }
            } else {

                var query1 = `SELECT a.* from ourshopee_promotioncode a WHERE a.promotion_code='${coupon}' and a.from < '${dateStringWithTime}' AND a.to > '${dateStringWithTime}' and country_id = 1 and platform = 1 `;

                var couponDetails = await db.runQuery(query1);

                couponDetails = couponDetails[0];

                if (couponDetails.length > 0 && couponDetails[0]['platform'] == 1) {
                    msg = "Coupon applicable only on mobile app ! ";
                    var link = "http://www.ourshopee.org/mob-app";
                } else {
                    msg = "Invalid Coupon Code";
                }
            }
        }
        var jsonOutput = {
            msg: msg,
            discount: discount,
            link: link
        }
        return jsonOutput;
    } catch (err) {
        return 'error';
    }
}

const checkOrder = async (req) => {
    try {

        var query1 = `SELECT * from shopee_orders WHERE orderid='${req.body.invoice}' OR refid='${req.body.invoice}' and country_id=1`;

        var result = await db.runQuery(query1);

        result = result[0];

        if (result.length > 0) {
            return ""
        } else {
            return "Please Enter valid Order Id";
        }

    } catch (err) {
        return 'error';
    }
}

const addComplaint = async (req) => {
    try {
        const current_date = await datetimeHelper.currentDateTime();

        var invoice = req.body.invoice;
        var email = req.body.email;
        var mobile = req.body.mobile;
        var comment = req.body.comment;
        var sms = req.body.mobile;


        var query1 = `SELECT * from shopee_complaints WHERE 
        invoiceno='${invoice}' OR refid='${invoice}' AND status != 'Done'`;

        var findcompaint = await db.runQuery(query1);
        findcompaint = findcompaint[0];
        if (findcompaint.length > 0) {
            var msg = "registered";
            return msg;
        }
        else {

            var query = `SELECT * from shopee_orders WHERE 
            orderid='${invoice}' or refid ='${invoice}' and contact='${mobile}'`;

            var find = await db.runQuery(query);
            find = find[0];
            if (find.length > 0) {
                var query_compid = `SELECT max(id) as max from shopee_complaints`;
                var cmp_result = await db.runQuery(query_compid);
                cmp_result = cmp_result[0];
                if (cmp_result.length > 0) {
                    var comp = cmp_result[0].max + 1;
                    var complaint_id = "OS" + comp + invoice;
                    var cname = find[0]['customer'];
                    var orderid = find[0]['orderid'];
                    var refid = find[0]['refid'];

                    var sql = `INSERT INTO shopee_complaints (name, email, mobile, invoiceno, comment, date, complaint_id, status, sms_no, refid)
                     VALUES("${cname}", "${email}", "${mobile}", "${orderid}", "${comment}",'${current_date}', "${complaint_id}", "Pending", "${mobile}", "${refid}") `;
                    var result = await db.runQuery(sql);

                    if (result[0].insertId != null) {
                        return "successfully registered a complaint"
                    } else {
                    }
                }
            } else {
                return "Please Enter Valid Order Id/Registered contact number";
            }
        }
    } catch (err) {
        return 'error';
    }
}

const getComplaint = async (req) => {
    try {

        var query = `SELECT * from shopee_complaints WHERE complaint_id='${req.body.cno}'`;

        var find = await db.runQuery(query);

        find = find[0];

        if (find.length > 0) {
            var data = find[0];

            // $e = explode(' ', $date);
            // $emydate = $e[0];
            // $emonth = date("M", strtotime($emydate));
            // $eday = date("d", strtotime($emydate));
            // $eyear = date("Y", strtotime($emydate));

            var msg = `Hi, ${data['name']} 
            Thank you for contacting OurShopee Support
    Your complaint created on $eday ?>, <?= $emonth ?> <?= $eyear ?>`;
            var msgType = 1;
            if (data['status'] == 'Pending') {
                var msg = `Your complaint reference number <b>'".$data['complaint_id']."'</b> is in Progress. "`;
                var msgType = 2;
            }
            if (data['status'] == 'On Process') {

                var query = `SELECT * from shopee_complaintstatus WHERE complaint_id='${data["id"]}'`;

                var tec_complaint = await db.runQuery(query);

                tec_complaint = tec_complaint[0];

                if (tec_complaint.length > 0) {

                    if (tec_complaint['status'] == '') {
                        var status = "Pending";
                    }
                    if (status == "Pending") {
                        var msg = `Your complaint reference number <b>'".$data['complaint_id']."'</b> is in Progress`;
                        var msgType = 3;
                    }
                    if (tec_complaint['status'] == 'Sent Email') {
                        var msg = `Our Deliver team will call you to collect your item.`;
                        var msgType = 4;

                    }
                    if (tec_complaint['status'] == 'Received') {
                        var msg = `Your Item has been received at Technical Store on ".date('d-m-Y H:s:i', strtotime($tec_complaint['post_date']))`
                        var techPostDate = tec_complaint['post_date'];
                        var msgType = 5;
                    }
                    if (tec_complaint['status'] == 'Hand Over To User') {
                        var msg = `Your Item has been received at Technical Store,Our Technical team is working on your reported issue`;
                        var msgType = 6;
                    }

                    if (tec_complaint['status'] == 'Despatch') {
                        var msg = `We appreciate your patience. Your Item has been ready and dispatched to Delivery team on ".date('d-m-Y H:s:i', strtotime($tec_complaint['post_date']))`;
                        var techPostDate = tec_complaint['post_date'];
                        var msgType = 7;
                    }

                } else {
                    var msg = `Our Technical team is working on your reported issue`;
                    var msgType = 8;
                }
            }

            if (data['status'] == 'Done' && data['section'] != "Rejected") {
                var msg = ` Your complain < b > '<?=$data['complaint_id']?>'</b > has been fixed on <?= $data['done_date'] ?>`;
                var msgType = 9;
            }


            if (data['section'] == "Rejected") {

                var msg = ` Your complain < b > '<?=$data['complaint_id']?>'</b > has been Rejected on <?= $data['done_date'] ?>.For more information please contact Ourshopee support: +97142582959.`;
                var msgType = 10;
            }
        }
        else {
            var msg = `Invalid Complain ID. Please check your COMPLAINT REFERENCE NUMBER again."`;
            var msgType = 11;
        }

        return {
            name: data["name"],
            msg: msg,
            date: data["date"],
            msgType: msgType,
            complaintId: data['complaint_id'],
            done_date: data['done_date'],
            techPostDate: techPostDate
        }

    } catch (err) {
        return 'error';
    }
}

module.exports = {
    myOrders: myOrders,
    checkOrder: checkOrder,
    addComplaint: addComplaint,
    getComplaint: getComplaint,
    checkCouponCode: checkCouponCode
}