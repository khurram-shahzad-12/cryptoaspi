const config = require('../../config');
const db = require('../../db');
const sendemailerr = require('../../helpers/email').emailerr;
const moment = require('moment');
const momenttimezone = require('moment-timezone');
const datetimeHelper = require('../../helpers/dateTimeHelper');
const section_model = require('../section/model');
const category_model = require('../category/model');
const product_model = require('../products/model');
const price_calculator = require('../category/model').price_calculator;
//----------------------------------------------------------------------ok
const gatcarousellist = async () => {

    try {
        var output = [];
        const country_id = process.env.country_id;
        var query = `select * from ourshopee_image_sliders where status = 1 and country_id = ${country_id} order by position asc limit 6`;

        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            output = await result[0].map((Element) => {
                let domain = (new URL(Element.url));
                
                return {
                    carousel_id: Element.id,
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_image_sliders/" + Element.image+"?",
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_image_sliders/" + Element.mobile_image+"?",
                    url: domain.pathname == "/" ? Element.url : domain.pathname
                }
            })
        }

        return output
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const gatbannerslist = async () => {
    try {
        var output = [];
        const country_id = process.env.country_id;
        // var query = `SELECT * FROM ourshopee_image_sliders where status = 1 and country_id = '${country_id}' order by position asc limit 0,6; `;
        var query = `SELECT * FROM ourshopee_banners 
        WHERE position between 1 and 4 and country_id = '${country_id}' and status = 1 ORDER BY position asc`;

        var result = await db.runQuery(query);

        if (result[0].length > 0) {
            output = await result[0].map((Element) => {

                let domain = (new URL(Element.url));
                return {
                    banner_id: Element.id,
                    banner_image: process.env.banners + Element.image,
                    url: domain.pathname
                }
            })
        }
        return output;
    } catch (err) {
        return 'error';
    }
}


//----------------------------------------------------------------------ok

const brand_week_elk = async (brand_id) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": 0,
            "size": 4,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": { "brand_id": brand_id }
                        },
                        {
                            "match": { "front_view": 1 }
                        },
                        {
                            "match": { "status": 1 }
                        },
                        {
                            "range": {
                                "special_price": {
                                    "gte": "0"
                                }

                            }
                        },
                        {
                            "match": { "stock": "In stock" }
                        },
                        {
                            "range": {
                                "quantity": {
                                    "gte": "0"
                                }

                            }
                        }
                    ]
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

const TopPicks_elk = async (brand_id) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "_source": false,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "stock": "In stock"
                            }
                        },
                        {
                            "match": {
                                "status": 1
                            }
                        },
                        { "range": { "quantity": { "gte": 1 } } },
                        { "range": { "special_price": { "gte": 1 } } },
                        { "terms": { "brand_id": brand_id } }
                    ]
                }
            },
            "aggs": {
                "products": {
                    "terms": {
                        "field": "brand_id"
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": { "size": 8 }
                        }
                    }
                }
            }
        }
    });

    return result.aggregations.products.buckets;
}

const brand_week = async () => {
    try {
        var output = [];
        const country_id = process.env.country_id;
        var query = `SELECT s.*,b.url as slug FROM ourshopee_all_sliders s
        left join ourshopee_brands b on b.id = s.brand_id
        WHERE slider_type = 'week_brand' and status = 1 and country_id = '${country_id}' and status = 1`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            const brand_Week_data = await brand_week_elk(result[0][0].brand_id);
            output = await result[0].map((Element) => {
                return {
                    desktopImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_all_sliders/" + Element.en_image,
                    mobileImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_all_sliders/" + Element.en_mobile_image,
                    sku: Element.slug,
                    items: brand_Week_data.map((item) => {
                        const values = category_model.price_calculator(item);
                        return {
                            id: item.id,
                            name: item.name,
                            display_price: `AED ${values.display_price}`,
                            countdown: moment(item.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                            old_price: "AED " + item.price,
                            image: item.image,
                            percentage: `${values.percentage}`,
                            url: `${item.url}/${item.sku}`,
                            sku: item.sku
                        }
                    })
                }
            })
        }
        return output;
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const multibannerslist = async () => {

    try {
        var output = [];
        var query = `SELECT hb.* FROM (SELECT id FROM ourshopee_homecategory where position = 2 limit 1) as homecategory
        JOIN ourshopee_homebanners hb ON hb.category_id = homecategory.id order by position asc limit 2`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            output = result[0].map((Element) => {
                let domain = (new URL(Element.mobile_url));
                return {
                    banner_id: Element.id,
                    banner_image: "https://www.ourshopee.com/ourshopee-img/ourshopee_homebanners/" + Element.image,
                    url: domain.pathname
                }
            })
        }

        return output
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const pre_owned = async () => {
    try {
        const output = config.config_data.filter(Element => (Element.type == 'pre-owned-banners'));
        return output
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const call_common_elk = async () => {
    const exciting_offers = config.config_data.filter(Element => (Element.type == 'exciting_offers'));
    const deal_of_the_day = config.config_data.filter(Element => (Element.type == 'deal_of_the_day'));

    var now = new Date();

    var exciting_offersdateStringWithTime = moment(now).add(1, 'days').format('YYYY-MM-DD HH:mm:ss');
    var exciting_offers_datetime = moment.utc(exciting_offersdateStringWithTime).toISOString()

    var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
    var deal_of_the_Day_datetime = moment.utc(dateStringWithTime).toISOString()


    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 0,
            "aggs": {
                "deal_of_the_day": {
                    "filter": {
                        "bool": {
                            "must": [
                                {
                                    "range": {
                                        "from_date": {
                                            "lte": deal_of_the_Day_datetime
                                        }
                                    }
                                },
                                {
                                    "match": {
                                        "stock": "In stock"
                                    }
                                },
                                {
                                    "match": {
                                        "status": 1
                                    }
                                },
                                {
                                    "match": {
                                        "section_id": deal_of_the_day[0].section_id
                                    }
                                }
                            ]
                        }

                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "sort": { "from_date": "desc" },
                                "size": deal_of_the_day[0].limit
                            }
                        }
                    }
                },
                "exciting_offers": {
                    "filter": {
                        "bool": {
                            "must": [
                                {
                                    "range": {
                                        "offer_from": {
                                            "lte": exciting_offers_datetime
                                        }
                                    }
                                },
                                {
                                    "range": {
                                        "offer_to": {
                                            "gte": exciting_offers_datetime
                                        }
                                    }
                                },
                                {
                                    "match": {
                                        "stock": "In stock"
                                    }
                                },
                                { "range": { "quantity": { "gte": 1 } } }
                            ]
                        }
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "sort": {
                                    "updated_date": "desc"
                                },
                                "size": exciting_offers[0].limit
                            }
                        }
                    }
                }
            }
        }
    });

    return {
        deal_of_the_day: result.aggregations.deal_of_the_day.docs.hits,
        exciting_offers: result.aggregations.exciting_offers.docs.hits
    }
}

//----------------------------------------------------------------------ok
const call_common_elk1 = async () => {
    const clearance_sale = config.config_data.filter(Element => (Element.type == 'clearance_sale'));
    const bundle_deals = config.config_data.filter(Element => (Element.type == 'bundle_deals'));

    var now = new Date();

    var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
    var datetime = moment.utc(dateStringWithTime).toISOString()

    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 0,
            "aggs": {
                "clearance_sale": {
                    "filter": {
                        "bool": {
                            "must": [
                                {
                                    "range": {
                                        "from_date": {
                                            "lte": datetime
                                        }
                                    }
                                },
                                {
                                    "range": {
                                        "quantity": {
                                            "gte": 1
                                        }
                                    }
                                },
                                {
                                    "match": {
                                        "section_id": clearance_sale[0].section_id
                                    }
                                },
                                {
                                    "match": {
                                        "status": 1
                                    }
                                },
                                { "match": { "stock": "In stock" } },
                            ]
                        }

                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "sort": { "from_date": "desc" },
                                "size": clearance_sale[0].limit
                            }
                        }
                    }
                },
                "bundle_deals": {
                    "filter": {
                        "bool": {
                            "must": [
                                // {
                                //     "range": {
                                //         "from_date": {
                                //             "lte": datetime
                                //         }
                                //     }
                                // },
                                {
                                    "match": {
                                        "section_id": bundle_deals[0].section_id
                                    }
                                },
                                {
                                    "range": {
                                        "quantity": {
                                            "gte": 1
                                        }
                                    }
                                },
                                {
                                    "match": {
                                        "status": 1
                                    }
                                },
                                { "match": { "stock": "In stock" } },

                            ]
                        }

                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "sort": { "from_date": "desc" },
                                "size": bundle_deals[0].limit
                            }
                        }
                    }
                }
            }
        }
    });

    return {
        clearance_sale: result.aggregations.clearance_sale.docs.hits,
        bundle_deals: result.aggregations.bundle_deals.docs.hits
    }
}

//----------------------------------------------------------------------ok
const exicting_offers = async () => {
    try {
        var input_data = { section_id: 117, offset: 0, limit: 4, front_view: 1 }
        const home_deal_offers_data = await call_common_elk();
        return {
            "exciting_offers": home_deal_offers_data.exciting_offers.hits.map(h => h._source).map(Element => {
                const path = (Element.transparent_image == '') ? Element.image.replace('/thump','') +"?" : 'https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/' + Element.transparent_image + "?";

                const values = price_calculator(Element);
                return {
                    id: Element.id,
                    image: path,
                    countdown: moment(Element.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                    name: Element.name,
                    sub_category: Element.subcategory,
                    old_price: 'AED ' + Element.price,
                    display_price: `AED ${values.display_price}`,
                    percentage: values.percentage,
                    url: Element.url.substr(0, 60) + "/" + Element.sku + "/"
                }
            }),
            "deal_of_the_day": home_deal_offers_data.deal_of_the_day.hits.map(h => h._source).map(Element => {
                const path = (Element.transparent_image == '') ? Element.image : 'https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/' + Element.transparent_image;

                const values = price_calculator(Element);
                return {
                    id: Element.id,
                    image: path,
                    countdown: moment(Element.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    name: Element.name,
                    old_price: 'AED ' + Element.price,
                    display_price: `AED ${values.display_price}`,
                    percentage: values.percentage,
                    url: Element.url.substr(0, 60) + "/" + Element.sku + "/"
                }
            })
        }
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const bundle_deals = async () => {
    try {
        const home_deal_offers_data = await call_common_elk1();
        return {
            "clearance_sale": home_deal_offers_data.clearance_sale.hits.map(h => h._source).map(Element => {
                const path = (Element.transparent_image == '') ? Element.image : 'https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/' + Element.transparent_image;

                const values = price_calculator(Element);
                return {
                    id: Element.id,
                    image: path,
                    // countdown: moment(Element.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    name: Element.name,
                    old_price: 'AED ' + Element.price,
                    display_price: `AED ${values.display_price}`,
                    percentage: values.percentage,
                    url: Element.url.substr(0, 60) + "/" + Element.sku + "/"
                }
            }),
            "bundle_deals": home_deal_offers_data.bundle_deals.hits.map(h => h._source).map(Element => {
                const path = (Element.transparent_image == '') ? Element.image : 'https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/' + Element.transparent_image;

                const values = price_calculator(Element);
                return {
                    id: Element.id,
                    image: path,
                    countdown: moment(Element.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    name: Element.name,
                    old_price: 'AED ' + Element.price,
                    display_price: `AED ${values.display_price}`,
                    percentage: values.percentage,
                    url: Element.url.substr(0, 60) + "/" + Element.sku + "/"
                }
            })
        }
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const subcategory_items_elk = async (req) => {

    if (req.query.sub_subcat_url) {
        var dynamic_query = [
            { "match": { "front_view": 1 } },
            { "match": { "stock": "In stock" } },
            { "match": { "status": 1 } },
            { "range": { "special_price": { "gte": 0 } } },
            { "range": { "quantity": { "gte": 0 } } },
            {
                "match": {
                    "sub_sub_category_url.keyword": req.query.sub_subcat_url
                }
            }
        ]
    } else {
        var dynamic_query = [
            { "match": { "front_view": 1 } },
            { "match": { "stock": "In stock" } },
            { "match": { "status": 1 } },
            { "range": { "special_price": { "gte": 0 } } },
            { "range": { "quantity": { "gte": 0 } } },
            {
                "match": {
                    "subcategory_url.keyword": req.query.subcat_url
                }
            }
        ]
    }

    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": 0,
            "size": 10,
            "sort": [{ "updated_date": { "order": "desc" } }],
            "query": {
                "bool": {
                    "must": dynamic_query
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

//----------------------------------------------------------------------ok
const category_items = async () => {
    try {
        const data = config.config_data.filter(Element => (Element.type == 'category_items'));

        var query = " SELECT count(p.subcategory_id) as total , s.id as subcategory_id, s.name as subcategory_name, s.url FROM ourshopee_products p LEFT join ourshopee_subcategory s on s.id = p.subcategory_id where s.front_view = 1 and p.status = 1 and p.special_price > 0 and p.front_view = 1 and p.quantity > 0 and p.stock = 'In stock' GROUP By p.subcategory_id HAVING total > 5 order by s.position asc ";
        /* var query = ` SELECT id as subcategory_id, name as subcategory_name, url FROM ourshopee_subcategory where front_view=1
                        order by position asc, id asc limit  ${data[0].limit} `; */

        var result = await db.runQuery(query);
        result = result[0];

        var arrayresult = await Promise.all(result.map(async (subcategory) => {

            const req = { 'query': { 'subcat_url': subcategory.url, 'page': 1 } }

            var esresult = await subcategory_items_elk(req);

            var products = esresult.map((ele) => {

                var display_price = ele.price - ele.special_price;

                var percentage = display_price / ele.price * 100;

                return {
                    id: ele.id,
                    brand_id: ele.brand_id,
                    subcategory_id: ele.subcategory_id,
                    name: ele.name,
                    display_price: "AED " + ele.special_price,
                    image: ele.image,
                    percentage: Math.round(percentage),
                    old_price: "AED " + ele.price,
                    url: ele.url,
                    sku: ele.sku
                }
            });

            subcategory.items = products
            return subcategory
        }))

        return arrayresult

    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const getMaxDiscount = async () => {

    try {

        var query = `SELECT sc.id, sc.name, sc.image, sc.url,
            c.id as category_id,c.name as category_name
            FROM ourshopee_subcategory sc
            JOIN ourshopee_category c ON c.id=sc.category_id
            WHERE sc.front_view=1 AND (sc.category_id = 46 OR sc.category_id = 36) ORDER BY category_id DESC limit 0,12`;

        var result = await db.runQuery(query);
        var output = [];

        if (result[0].length > 0) {
            output = await result[0].filter((v, i, a) => a.findIndex(v2 => ['category_id'].every(k => v2[k] === v[k])) === i)
                .map((Element) => {
                    return {
                        category_id: Element.category_id,
                        category_name: Element.category_name,
                        productlist: result[0].filter(ele => ele.category_id == Element.category_id).map(ele2 => {
                            return {
                                id: ele2.id,
                                name: ele2.name,
                                image_name: ele2.image,
                                image_path: process.env.product_subcategory_path + ele2.image,
                                redirect_url: ele2.url,
                            }
                        })
                    }
                })
        }
        return output

    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const getTopPicks = async () => {
    try {

        // $brand_cond = " and slider_type = 'home_brand' and status = 1 and country_id = 1";
        // 				$brand_list =  $operation->getdata('ourshopee_all_sliders','*','','',$brand_cond,'','','');

        var query = `select * from ourshopee_all_sliders s
        LEFT JOIN ourshopee_brands b ON b.id = s.brand_id where slider_type = 'home_brand' and status = 1 and country_id = 1;`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            const elk_output = await TopPicks_elk(result[0].map(object => object.id));
            return await result[0].map((Element) => {
                return {
                    brand_id: Element.id,
                    image_slider: "https://www.ourshopee.com/ourshopee-img/ourshopee_all_sliders/" + Element.en_image,
                    url: Element.url,
                    productlist: elk_output.filter(filEle => filEle.key == Element.id).map(ele1 => {
                        return ele1.docs.hits.hits.map(ele2 => {
                            var display_price = ele2._source.price - ele2._source.special_price;

                            var percentage = display_price / ele2._source.price * 100;

                            return {
                                id: ele2._source.id,
                                brand_id: ele2._source.brand_id,
                                subcategory_id: ele2._source.subcategory_id,
                                name: ele2._source.name,
                                display_price: "AED " + ele2._source.special_price,
                                image: ele2._source.image,
                                percentage: Math.round(percentage),
                                old_price: "AED " + ele2._source.price,
                                url: ele2._source.url,
                                sku: ele2._source.sku
                            }
                        });
                    })[0]
                }
            })

        }
    } catch (err) {
        return 'error';
    }
}

// elk----------------------------------------------------------------------ok
const getTopSelling = async (req) => {
    try {
        const currentDateTime = await datetimeHelper.currentDateTime();
        var input_data = { section_id: 74, offset: 0, limit: 4 }
        topItemsList = await section_model.get_products_by_section_elk(input_data);
        topItemsList = await topItemsList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
            .map((ele) => {
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
                var show_image_path = afterlenght + '/' + ele.sku + '/';
                return {
                    id: ele.id,
                    name: ele.name,
                    sku: ele.sku,
                    image: ele.transparent_image != '' ? `https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/${ele.transparent_image}` : ele.image,
                    display_price: "AED " + addZeroes(display_price),
                    old_price: "AED " + addZeroes(ele.price),
                    percentage: Math.round(percentage),
                    url: show_image_path,
                }
            });
        if (topItemsList.length > 0) {
            return topItemsList;
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

//- get topselling in my mysql db for backup use--------------------------------------ok
const getTopSelling_bkp = async () => {

    try {

        const currentDateTime = await datetimeHelper.currentDateTime();
        var output = [];
        var sql = `SELECT a.product_id,
        b.name, b.sku, b.id, b.image, b.price, b.special_price, b.promotion_price, b.url, b.stock, b.quantity,
        b.brands_category_id, b.storage_id, b.color_id, b.shipping_charge, b.from_date, b.to_date,
        b.updated_date, b.transparent_image 
        FROM ourshopee_section_products a 
        LEFT JOIN ourshopee_products b ON a.product_id = b.id
        WHERE a.section_id = 74 and b.from_date < '${currentDateTime}' order by b.from_date desc,b.updated_date desc limit 0,4`;
        var result = await db.runQuery(sql);
        //var result = result[0];
        var color_array = ['blue__bg', 'orange__bg', 'purple__bg', 'orange__bg'];
        if (result[0].length > 0) {
            output = await result[0].map((ele2, index) => {
                //var color_class = color_array[index % 4];
                var currentdate = moment(currentDateTime).unix();
                if (ele2.from_date != '0000-00-00 00:00:00') {
                    var promotion_from = moment(ele2.from_date).unix();
                }
                if (ele2.to_date != '0000-00-00 00:00:00') {
                    var promotion_to = moment(ele2.to_date).unix();
                }
                if (currentdate > promotion_from && currentdate < promotion_to) {
                    display_price = ele2.promotion_price;
                } else {
                    display_price = ele2.special_price;
                }
                price = ele2.price;
                diff = price - display_price;
                percentage = diff / price * 100;
                timage = ele2.image;
                if (parseInt(ele2.special_price) > 0) {
                    sale_on = Math.round(((ele2.price - display_price) / ele2.price) * 100);
                }
                var show_image = process.env.product + 'thump/' + ele2.image;
                var afterlenght = '';
                if (ele2.url != '') {
                    afterlenght = ele2.url.substr(0, 60); // 'M'

                }
                var show_image_path = afterlenght + '/' + ele2.sku + '/'

                return {
                    id: ele2.product_id,
                    name: ele2.name,
                    sku: ele2.sku,
                    image: show_image,
                    display_price: "AED " + display_price,
                    old_price: "AED " + ele2.price,
                    percentage: Math.round(percentage),
                    url: show_image_path,
                }
            })
        }
        return output

    } catch (err) {
        return 'error';
    }
}

// Get Deal of the dayc and saver zone  home  page API elk  --------------------------------------ok
const getDealOfTheDay_and_SaverZone_elk = async (req) => {

    var dynamic_query = [
        {
            "match": {
                "stock": 'In stock'
            }
        },
        {
            "match": {
                "status": 1
            }
        },
    ];

    if (typeof req.section_id !== 'undefined' && req.section_id !== 0) {
        dynamic_query.push({
            "match": {
                "section_id": req.section_id
            }
        });
    }
    if (typeof req.from_date !== 'undefined' && req.from_date !== '') {
        var datetime = moment.utc(req.from_date).toISOString()
        dynamic_query.push({
            "range": {
                "from_date": {
                    "lte": datetime
                }
            }
        });
    }

    /*  if(typeof req.status !== 'undefined' && req.status !== '') {
         dynamic_query.push({
             "match": {
                 "status": req.status
             }
         });
     } */

    if (typeof req.quantity !== 'undefined' && req.quantity !== '') {
        dynamic_query.push({
            "range": {
                "quantity": {
                    "gte": req.quantity
                }
            }
        });
    }
    if (typeof req.special_price !== 'undefined' && req.special_price !== '') {
        dynamic_query.push({
            "range": {
                "special_price": {
                    "gte": req.special_price
                }
            }
        });
    }
    if (typeof req.offer_from !== 'undefined' && req.offer_from !== '') {
        var datetime = moment.utc(req.offer_from).toISOString();
        dynamic_query.push({
            "range": {
                "offer_from": {
                    "lte": datetime
                }
            }
        });
    }

    if (typeof req.stock !== 'undefined' && req.stock !== '') {
        dynamic_query.push({
            "match": {
                "stock": req.stock
            }
        });
    }

    if (req.type == 'saver') {
        sort = [{ "offer_from": { "order": "desc" } }];
    } else {
        sort = [{ "from_date": { "order": "desc" } }, { "updated_date": { "order": "desc" } }];
    }

    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": req.offset,
            "size": req.limit,
            "sort": sort,
            "query": {
                "bool": {
                    "must": dynamic_query
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

//----------------------------------------------------------------------ok
const getDealOfTheDay = async (req) => {

    try {

        const currentDateTime = await datetimeHelper.currentDateTime();
        var input_data = { section_id: 29, offset: 0, limit: 4, from_date: currentDateTime, }
        topItemsList = await getDealOfTheDay_and_SaverZone_elk(input_data);
        topItemsList = await topItemsList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
            .map((ele) => {
                var currentdate = moment(currentDateTime).unix();
                console.log(currentdate);
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
                var show_image_path = afterlenght + '/' + ele.sku + '/';
                return {
                    id: ele.id,
                    name: ele.name,
                    sku: ele.sku,
                    image: ele.image,
                    countdown: moment(ele.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    display_price: "AED " + addZeroes(display_price),
                    old_price: "AED " + addZeroes(ele.price),
                    percentage: Math.round(percentage),
                    url: show_image_path,
                    to_date: ele.to_date,
                }
            });
        if (topItemsList.length > 0) {
            return topItemsList;
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const getSaverZone = async (req) => {

    try {

        const currentDateTime = await datetimeHelper.currentDateTime();
        var input_data = { section_id: 16, offset: 0, limit: 4, status: 1, quantity: 0, stock: 'In stock', special_price: 0, offer_from: currentDateTime, order_by: 'offer_from', type: 'saver' }
        topItemsList = await getDealOfTheDay_and_SaverZone_elk(input_data);
        topItemsList = await topItemsList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
            .map((ele) => {
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
                var show_image_path = afterlenght + '/' + ele.sku + '/';
                return {
                    id: ele.id,
                    name: ele.name,
                    sku: ele.sku,
                    image: ele.image,
                    countdown: moment(ele.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                    display_price: "AED " + addZeroes(display_price),
                    old_price: "AED " + addZeroes(ele.price),
                    percentage: Math.round(percentage),
                    url: show_image_path,
                    offer_to: ele.offer_to,
                }
            });
        if (topItemsList.length > 0) {
            return topItemsList;
        } else {
            return 'notfound';
        }
    } catch (err) {
        return 'error';
    }
}

function addZeroes(num) {
    return num.toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2 })
}


//------------Category Section API

const categories_section_elk = async (req) => {

    const client = await config.elasticsearch();
    const result = await client.search({
        index: 'categories',
        body: {
            "size": "1000"
        }
    });
    return result.hits.hits.map(h => h._source);
}


const getCategorySection = async (req) => {

    try {

        const home_category_section = config.config_data.filter(Element => (Element.type == 'home_category_section'));
        const home_category = home_category_section[0];

        var subcategory_array = [];
        var category_ids;
        category_ids = home_category.categories.map((Element) => {
            subcategory_array = subcategory_array.concat(Element.subcategory)
            return Element.category_id;
        });

        const categories = category_ids.join();
        const subcategories = subcategory_array.join();


        var query = `SELECT c.id as category_id, c.url as url, c.name as category_name, concat("https://www.ourshopee.com/ourshopee-img/ourshopee_category/vector-icons/", c.vector_icon) as vector_icon, c.position as category_position, 
            sc.id as subcategory_id, sc.url as sub_url, sc.name as sub_category_name, concat("https://ourshopee.com/ourshopee-img/ourshopee_subcategory/", sc.image) as sub_category_image, sc.position as sub_category_position 
            FROM ourshopee_category c 
            LEFT JOIN ourshopee_subcategory sc ON sc.category_id = c.id 
            WHERE c.status = 1 and c.id IN (${categories})  and sc.id IN (${subcategories}); `;

        var results = await db.runQuery(query);

        const result = results[0];

        const category = result.filter((v, i, a) => a.findIndex(v2 => ['category_id', 'category_name'].every(k => v2[k] === v[k])) === i).map((Element5) => {
            return {
                category_id: Element5.category_id,
                category_name: Element5.category_name,
                url: Element5.url,
                vector_icon: Element5.vector_icon
            }
        })

        var category_array = [];
        const output = category.map((Element) => {
            const cat_id = Element.category_id;

            category_array[`"${cat_id}"`] = {
                ...Element,
                subcategory: result.filter((v, i, s) => s.findIndex(v2 => ['subcategory_id'].every(k => v2[k] === v[k])) === i).filter((Element2) => {
                    return Element.category_id == Element2.category_id
                }).map((Element3) => {
                    return {
                        category_id: Element3.category_id,
                        sub_category_id: Element3.subcategory_id,
                        sub_category_name: Element3.sub_category_name,
                        sub_category_image: Element3.sub_category_image,
                        url: Element3.sub_url
                    }
                }),
            }

        })

        var category_list = home_category.categories.map((Element) => {
            return category_array[`"${Element.category_id}"`];
        });

        return category_list


    } catch (err) {
        return 'error';
    }
}

module.exports = {
    gatcarousellist: gatcarousellist,
    gatbannerslist: gatbannerslist,
    exicting_offers: exicting_offers,
    bundle_deals: bundle_deals,
    category_items: category_items,
    multibannerslist: multibannerslist,
    getMaxDiscount: getMaxDiscount,
    getTopPicks: getTopPicks,
    getTopSelling: getTopSelling,
    getDealOfTheDay: getDealOfTheDay,
    brand_week: brand_week,
    pre_owned: pre_owned,
    getSaverZone: getSaverZone,
    getCategorySection: getCategorySection,
}