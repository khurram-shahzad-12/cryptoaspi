const config = require('../../config');
const db = require('../../db');
const sendemailerr = require('../../helpers/email').emailerr;
const moment = require('moment');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const category_model = require('../category/model');

const product_bank_offers = async () => {

    try {

        var query = `select * from ourshopee_payfort_bankdetails where status = 1`;
        var result = await db.runQuery(query);
        result = result[0];
        return result
    } catch (err) {
        return 'error';
    }
}

const tabbyactiveFun = async (subcat_id, display_price) => {

    try {

        var query = `select * from ourshopee_subcategory where id=${subcat_id}`;
        var result = await db.runQuery(query);
        result = result[0];
        if (result.length > 0) {
            var tabbyType = 0;

            if (result[0].tabby_type == 1) {

                tabbyType = 1;

            }

            var tabbyactive = 0;

            if (display_price > 2500) {

                tabbyactive = 0;

            } else if (tabbyType == 1 && display_price > 1500) {

                tabbyactive = 0;

            } else {

                tabbyactive = 1;

            }

            return tabbyactive
        }

    } catch (err) {
        return 'error';
    }
}
const DeliveryExpectedBy = async (sku) => {

    try {
        var query = `select * from shopee_products where product_code="${sku}"`;
        var result = await db.runQuery(query);
        result = result[0];
        var fastTrack = 0;
        const currentDateTime = await datetimeHelper.currentDateTime();
        if (result.length > 0) {
            result = result[0];
            if (result['quantity'] >= 3) {
                fastTrack = 1;
                var expected_delivery_date = moment(currentDateTime).add(2, 'days').format('YYYY-MM-DD-dddd HH:mm:ss');
            } else {
                fastTrack = 0;
                var day = moment(currentDateTime).add(5, 'days').format('dddd').substring(0, 3);
                var month = moment(currentDateTime).add(5, 'days').format('MMMM').substring(0, 3);
                var expected_delivery_date = day + ", " + month + " " + moment(currentDateTime).add(5, 'days').format('DD');
            }

            //Calculate difference

            // $now = time();

            // $tom = mktime(0, 0, 0, date('m'), date('d') + 1, date('Y'));
        } else {
            fastTrack = 0;
            var day = moment(currentDateTime).add(5, 'days').format('dddd').substring(0, 3);
            var month = moment(currentDateTime).add(5, 'days').format('MMMM').substring(0, 3);
            var expected_delivery_date = day + ", " + month + " " + moment(currentDateTime).add(5, 'days').format('DD');
        }

        return {
            fastTrack: fastTrack,
            delivery: `Delivery Expected By ${expected_delivery_date}`
        }

    } catch (err) {
        return 'error';
    }
}


const related_items = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 6,
            "sort": [
                {
                    "id": {
                        "order": "desc"
                    }
                },
            ],
            "query": {
                "bool": {
                    "must": [
                        { "term": { "brand_id": req.body.brand_id } },
                        { "term": { "subcategory_id": req.body.subcategory_id } }
                    ],
                    "must_not": {
                        "bool": {
                            "must": [
                                { "match": { "sku": req.body.sku } }
                            ]
                        }
                    }
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}
const previously_viewed = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 6,
            "sort": [
                {
                    "id": {
                        "order": "desc"
                    }
                },
            ],
            "query": {
                "bool": {
                    "must": [
                        { "terms": { "sku": req.body.skulist } },
                    ]
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

const availableAttributesElk = async (id, array, type, nonArray) => {
    try {

        if (type == 'colors') {
            var dynamic_query = [
                {
                    "match": { "brands_category_id": id }
                },
                {
                    "terms": { "color_id": array }
                },
                {
                    "match": { "storage_id": nonArray }
                }
            ]
        } else if (type == 'storage') {
            var dynamic_query = [
                {
                    "match": { "brands_category_id": id }
                },
                {
                    "match": { "color_id": nonArray }
                },
                {
                    "terms": { "storage_id": array }
                }
            ]
        }


        const client = await config.elasticsearch();
        const result = await client.search({
            index: process.env.es_index, //'normalized_products9',
            body: {
                "query": {
                    "bool": {
                        "must": dynamic_query
                    }
                }
            }
        });

        return result.hits.hits.map(h => h._source);
    } catch (err) {
        return 'error';
    }
}

const availableAttributes = async (tablename, tablename2, columnname, id) => {
    try {
        var query = `select * from ${tablename} t1
        left join ${tablename2} t2 on t2.id = t1.${columnname}
        where brandscategory_id = ${id} order by t1.id asc`;
        var result = await db.runQuery(query);
        result = result[0];
        return result
    } catch (err) {
        return 'error';
    }
}

const product_detail_elk = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "query": {
                "bool": {
                    "must": [
                        { "match": { "sku": req.query.sku } }
                    ]
                }
            }
        }
    });

    const currentDateTime = await datetimeHelper.currentDateTime();

    var currentdate = moment(currentDateTime).unix();

    const values = result.hits.hits.map(h => h._source)[0];

    const bank_offers_output = values.special_price > 500 ? await product_bank_offers() : [];

    // const display_price = parseFloat(values.special_price);


    const priceOutput = category_model.price_calculator(values);

    const display_price = priceOutput.display_price;

    var price = values.price;
    var diff = price - display_price;
    var percentage = diff / price * 100;

    const bank_offers = bank_offers_output.map((Element) => {


        var bank_emi_display = 0;

        if (Element["3-month-intrest"] != '') {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_3months = (display_price * parseInt(Element['3-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_3months = parseInt(Element['3-month-processing']);
            }

            var emi_intrest_3months = ((display_price + proceesingfee_3months) * parseFloat(Element['3-month-intrest'])) / 100;

            var emi_amount_3months = (display_price + proceesingfee_3months) / 3;

            var payamount_3months = emi_amount_3months + emi_intrest_3months;

            bank_emi_display = payamount_3months;

        }

        //six months

        if (Element['6-month-intrest']) {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_6months = (display_price * parseInt(Element['6-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_6months = parseInt(Element['6-month-processing']);
            }

            var emi_intrest_6months = ((display_price + proceesingfee_6months) * parseFloat(Element['6-month-intrest'])) / 100;

            var emi_amount_6months = (display_price + proceesingfee_6months) / 6;

            var payamount_6months = emi_amount_6months + emi_intrest_6months;

            bank_emi_display = payamount_6months;
        }


        //nine months

        if (Element['9-month-intrest'] != '') {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_9months = (display_price * parseInt(Element['9-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_9months = parseInt(Element['9-month-processing']);
            }

            var emi_intrest_9months = ((display_price + proceesingfee_9months) * parseFloat(Element['9-month-intrest'])) / 100;

            var emi_amount_9months = (display_price + proceesingfee_9months) / 9;

            var payamount_9months = emi_amount_9months + emi_intrest_9months;

            bank_emi_display = payamount_9months;

        }


        //12 months
        if (Element['12-month-intrest'] != '') {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_12months = (display_price * parseInt(Element['12-month-processing']) || 0 / 100);
            } else {
                proceesingfee_12months = parseInt(Element['12-month-processing'])
            }
            var emi_intrest_12months = ((display_price + proceesingfee_12months) * parseFloat(Element['12-month-intrest'])) / 100;

            var emi_amount_12months = (display_price + proceesingfee_12months) / 12;

            var payamount_12months = emi_amount_12months + emi_intrest_12months;

            bank_emi_display = payamount_12months;

        }


        //18 months

        if (Element['18-month-intrest'] != '') {

            if (Element['processing_fee_type'] == "") {
                var proceesingfee_18months = (display_price * parseInt(Element['18-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_18months = parseInt(Element['18-month-processing'])
            }

            var emi_intrest_18months = ((display_price + proceesingfee_18months) * parseFloat(Element['1-month-intrest'])) / 100;

            var emi_amount_18months = (display_price + proceesingfee_18months) / 18;

            var payamount_18months = emi_amount_18months + emi_intrest_18months;

            bank_emi_display = payamount_18months;

        }


        //24 months

        if (Element['24-month-intrest'] != '') {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_24months = (display_price * parseInt(Element['24-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_24months = parseInt(Element['24-month-processing'])
            }
            var emi_intrest_24months = ((display_price + proceesingfee_24months) * parseFloat(Element['24-month-intrest'])) / 100;

            var emi_amount_24months = (display_price + proceesingfee_24months) / 24;

            var payamount_24months = emi_amount_24months + emi_intrest_24months;

            bank_emi_display = payamount_24months;

        }

        //36 months

        if (Element['36-month-intrest'] != '') {
            if (Element['processing_fee_type'] == "") {
                var proceesingfee_36months = (display_price * parseInt(Element['36-month-processing']) || 0 / 100);
            } else {
                var proceesingfee_36months = parseInt(Element['36-month-processing'])
            }

            var emi_intrest_36months = ((display_price + proceesingfee_36months) * parseFloat(Element['36-month-intrest'])) / 100;

            var emi_amount_36months = (display_price + proceesingfee_36months) / 36;

            var payamount_36months = emi_amount_36months + emi_intrest_36months;

            bank_emi_display = payamount_36months;

        }

        return {
            id: Element.id,
            value: `Standard EMI Plans. Pay AED ${bank_emi_display.toFixed(2)} with`,
            image: `https://www.ourshopee.com/images/payfort-bank/${Element.logo}`,
            tag: Element.bank_name,
            modal_data: {
                bank_name: Element.bank_name,
                bank_id: Element.id,
                plans: [
                    {
                        time_period: "3 Months",
                        description: Element["3-month-intrest"] != '' ? {
                            interest: `3 EMI's @ ${Element["3-month-intrest"]}%`,
                            payamount: `AED ${payamount_3months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["3-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_3months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_3months * 3).toFixed(2)}`,
                            total_amnt_left: `3x${payamount_3months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_3months * 3).toFixed(2)}`,
                        } : []
                    },
                    {
                        time_period: "6 Months",
                        description: Element["6-month-intrest"] != '' ? {
                            interest: `6 EMI's @ ${Element["6-month-intrest"]}%`,
                            payamount: `AED ${payamount_6months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["6-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_6months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_6months * 6).toFixed(2)}`,
                            total_amnt_left: `6x${payamount_6months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_6months * 6).toFixed(2)}`,
                        } : []

                    },
                    {
                        time_period: "9 Months",
                        description: Element["9-month-intrest"] != '' ? {
                            interest: `9 EMI's @ ${Element["9-month-intrest"]}%`,
                            payamount: `AED ${payamount_9months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["9-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_9months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_9months * 9).toFixed(2)}`,
                            total_amnt_left: `9x${payamount_9months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_9months * 9).toFixed(2)}`,
                        } : []
                    },
                    {
                        time_period: "12 Months",
                        description: Element["12-month-intrest"] != '' ? {
                            interest: `12 EMI's @ ${Element["12-month-intrest"]}%`,
                            payamount: `AED ${payamount_12months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["12-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_12months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_12months * 12).toFixed(2)}`,
                            total_amnt_left: `12x${payamount_12months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_12months * 12).toFixed(2)}`,
                        } : []
                    },
                    {
                        time_period: "18 Months",
                        description: Element["18-month-intrest"] != '' ? {
                            interest: `18 EMI's @ ${Element["18-month-intrest"]}%`,
                            payamount: `AED ${payamount_18months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["18-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_18months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_18months * 18).toFixed(2)}`,
                            total_amnt_left: `18x${payamount_18months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_18months * 18).toFixed(2)}`,
                        } : []
                    },
                    {
                        time_period: "24 Months",
                        description: Element["24-month-intrest"] != '' ? {
                            interest: `24 EMI's @ ${Element["24-month-intrest"]}%`,
                            payamount: `AED ${payamount_24months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["24-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_24months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_24months * 24).toFixed(2)}`,
                            total_amnt_left: `24x${payamount_24months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_24months * 24).toFixed(2)}`,
                        } : []
                    },
                    {
                        time_period: "36 Months",
                        description: Element["36-month-intrest"] != '' ? {
                            interest: `36 EMI's @ ${Element["36-month-intrest"]}%`,
                            payamount: `AED ${payamount_36months.toFixed(2)}/Month`,
                            price: `AED ${display_price}`,
                            interest_num: `${Element["36-month-intrest"]}%`,
                            processing_fee: `AED ${proceesingfee_36months}`,
                            emi_interest_to_bank: `AED ${(emi_intrest_36months * 36).toFixed(2)}`,
                            total_amnt_left: `36x${payamount_36months.toFixed(2)}`,
                            total_amnt_right: `AED ${(payamount_36months * 36).toFixed(2)}`,
                        } : []
                    }
                ]
            }
        }
    })



    const product = await Promise.all(result.hits.hits.map(async (ele) => {

        if ((ele._source.offer_from < currentDateTime && ele._source.to_date > currentDateTime) || (ele._source.offer_from < currentDateTime && ele._source.offer_to > currentDateTime)) {

            if (ele._source.from_date < currentDateTime && ele._source.to_date > currentDateTime) {
                var countdownDate = ele._source.to_date;
            } else {
                var countdownDate = ele._source.offer_to;
            }

        }


        if (ele._source.brands_category_id != null && ele._source.brands_category_id != '' && ele._source.brands_category_id != 0) {
            var attributesOutputColors = await availableAttributes('ourshopee_brandscategory_colors', 'ourshopee_colors', 'color_id', ele._source.brands_category_id)
            var attributesOutputStorage = await availableAttributes('ourshopee_brandscategory_storage', 'ourshopee_storage', 'storage_id', ele._source.brands_category_id)
            var attributesOutputColorsElk = await availableAttributesElk(ele._source.brands_category_id, attributesOutputColors.map(object => object.color_id), 'colors', ele._source.storage_id)
            var attributesOutputStorageElk = await availableAttributesElk(ele._source.brands_category_id, attributesOutputStorage.map(object => object.storage_id), 'storage', ele._source.color_id)

            var attArr = [
                {
                    id: 1,
                    title: "Available Colors",
                    list: attributesOutputColorsElk.map(ele => {
                        return {
                            id: ele.color_id,
                            name: ele.color_name,
                            url: ele.url,
                            sku: ele.sku,
                            code: attributesOutputColors.filter(ert => ert.id == ele.color_id)[0].code
                        }
                    }).filter(col => col.id != 0)
                },
                {
                    id: 2,
                    title: "Available Storage",
                    list: attributesOutputStorageElk.map(ele => {
                        return {
                            id: ele.storage_id,
                            name: attributesOutputStorage.filter(ert => ert.id == ele.storage_id)[0].name,
                            url: ele.url,
                            sku: ele.sku,
                            code: ''
                        }
                    }).filter(col => col.id != 0)
                },
            ]


        } else {
            var attArr = []
        }

        var tabbyactiveFunOp = await tabbyactiveFun(ele._source.subcategory_id, display_price);
        var DeliveryExpectedByOp = await DeliveryExpectedBy(ele._source.sku);

        return {
            id: ele._source.id,
            brand_id: ele._source.brand_id,
            color_id: ele._source.color_id,
            storage_id: ele._source.storage_id,
            size_id: ele._source.size_id,
            category_id: ele._source.category_id,
            category_name: ele._source.category_name,
            category_url: ele._source.category_url,
            subcategory_id: ele._source.subcategory_id,
            subcategory_name: ele._source.subcategory_name,
            subcategory_url: ele._source.subcategory_url,
            sub_sub_category_id: ele._source.sub_sub_category_id,
            sub_sub_category_name: ele._source.sub_sub_category_name,
            sub_sub_category_url: ele._source.sub_sub_category_url,
            name: ele._source.name,
            display_price: "AED " + display_price,
            percentage: Math.round(percentage),
            old_price: "AED " + ele._source.price,
            image: ele._source.image.replace('/thump',''),
            stock: ele._source.stock,
            quantity: ele._source.quantity,
            url: ele._source.url,
            alternateAttributes: attArr,
            sku: ele._source.sku,
            tabbyactive: tabbyactiveFunOp,
            details: ele._source.details,
            ...(((ele._source.from_date < currentDateTime && ele._source.to_date > currentDateTime) || (ele._source.offer_from < currentDateTime && ele._source.offer_to > currentDateTime)) && { countdown: countdownDate }),
            brand: ele._source.brand_name,
            fastTrack: DeliveryExpectedByOp.fastTrack,
            delivery: DeliveryExpectedByOp.delivery,
            images: ele._source.product_images[0] != null ?
                [ele._source.image.replace('/thump',''), ...ele._source.product_images] :
                ele._source.product_images.length <= 0 && [ele._source.image.replace('/thump','')],
            video_link: ele._source.hasOwnProperty("video_link") ? ele._source.video_link : "",
            small_desc_data: [
                {
                    title: "SKU",
                    value: ele._source.sku
                },
                {
                    title: "Brand",
                    value: ele._source.brand_name
                },
                ...(ele._source.attributes.filter(ert => ert.key == 'Operating System').length > 0 ? (
                    [{
                        title: 'Operating System',
                        value: ele._source.attributes.filter(ert => ert.key == 'Operating System')[0].value
                    }]
                ) : []),

                ...(ele._source.warranty > 0 ? (
                    [{
                        title: 'Product Warranty',
                        value: ele._source.warranty + (ele._source.warranty_type == '2' ? 'Days' : 'Months')
                    }]
                ) : []),

                ...(ele._source.color_name != null ? (
                    [{
                        title: 'Color',
                        value: ele._source.color_name
                    }]
                ) : []),
                ...(ele._source.attributes.filter(ert => ert.key == 'Storage').length > 0 ? (
                    [{
                        title: 'Storage',
                        value: ele._source.attributes.filter(ert => ert.key == 'Storage')[0].value
                    }]
                ) : []),
                ...(ele._source.hasOwnProperty("OS") ? (
                    [{
                        title: 'OS',
                        value: ele._source.OS
                    }]
                ) : []),
                ...(ele._source.hasOwnProperty("Storage") ? (
                    [{
                        title: 'Storage',
                        value: ele._source.Storage
                    }]
                ) : []),
            ],
            bank_offers: bank_offers
        }
    }));

    return {
        product: product
    }
}

const product_detail = async (req) => {
    try {
        const elk_result = await product_detail_elk(req);
        const searched_products = elk_result
        return searched_products
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        return 'error';
    }
}

const get_relatedItems = async (req) => {
    try {
        const elk_result = await related_items(req);
        const elk_result_previously_viewed = await previously_viewed(req);
        return {
            related_products: elk_result.map(item => {
                const values = category_model.price_calculator(item);

                return {
                    id: item.id,
                    name: item.name,
                    display_price: values.display_price,
                    old_price: item.price,
                    image: item.image,
                    percentage: `${values.percentage}`,
                    url: item.url,
                    sku: item.sku,
                    currency_type: "AED"
                }
            }),
            recently_viewed: elk_result_previously_viewed.length > 0 ? elk_result_previously_viewed.map(item => {
                const values = category_model.price_calculator(item);
                return {
                    id: item.id,
                    name: item.name,
                    display_price: "AED " + values.display_price,
                    old_price: "AED " + item.price,
                    image: item.image,
                    percentage: `${values.percentage}`,
                    url: item.url,
                    sku: item.sku,
                    currency_type: "AED"
                }
            }) : [],
        }
    } catch (err) {
        return 'error';
    }
}

module.exports = {
    product_detail: product_detail,
    get_relatedItems: get_relatedItems,
    previously_viewed: previously_viewed
}