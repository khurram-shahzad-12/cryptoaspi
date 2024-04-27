const config = require('../../config');
const db = require('../../db');
const sendemailerr = require('../../helpers/email').emailerr;
const category_model = require('../category/model')
const moment = require('moment');
const momenttimezone = require('moment-timezone');
const datetimeHelper = require('../../helpers/dateTimeHelper');

const section_dynamic_cond = (sub) => {
    if (sub['en_redirection'] != '') {
        var redirection = sub['en_redirection'];
    } else if (sub['subcategory_id'] != 0 && sub['sub_sub_cat_id'] != 0) {
        var redirection = `https://www.ourshopee.com/products-subcategory/${sub['subcaturl']}/${sub['subsuburl']}/`;
    } else if (sub['subcategory_id'] != 0 && sub['brand_id'] != 0) {
        var redirection = `${sub['brandurl']}/${sub['subcaturl']}/`;
    } else {
        var redirection = `https://www.ourshopee.com/products-category/${sub['subcaturl']}/`;
    }

    var subcatId = sub['subcategory_id'];

    var subsubid = sub['sub_sub_cat_id'];

    var brand_id = sub['brand_id'];

    var listingCond = "";

    var elk_cond_Array = [];

    if (subcatId != 0) {
        listingCond += `and subcategory_id=${subcatId}`;
        elk_cond_Array = { ...elk_cond_Array, ["subcategory_id"]: subcatId }
    }

    if (subsubid != 0) {
        listingCond += `and sub_subcategory_id=${subsubid}`;
        elk_cond_Array = { ...elk_cond_Array, ["sub_sub_category_id"]: subsubid }
    }

    if (brand_id != 0) {
        listingCond += `and brand_id=${brand_id}`;
        elk_cond_Array = { ...elk_cond_Array, ["brand_id"]: brand_id }
    }

    return {
        redirection: redirection,
        listingCond: listingCond,
        elk_cond_Array: elk_cond_Array
    }
}

const most_picked_items_elk = async (data) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 12,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": { "subcategory_id": data.subcategory_id }
                        },
                        {
                            "match": { "stock": "In stock " }
                        },
                        {
                            "range": {
                                "special_price": {
                                    "gte": "0"
                                }

                            }
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

const get_products_by_ids_elk = async (products_ids) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "query": {
                "terms": {
                    "id": products_ids
                }
            }
        }
    });
    return result.hits.hits.map(h => h._source);
}

//----------------------------------------------------------------------ok
const get_products_by_section_elk = async (req) => {
    var must_array = [];
    var now = new Date();

    var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
    var datetime = moment.utc(dateStringWithTime).toISOString()
    
    
    must_array.push({
            "range": {
                "from_date": {
                    "lte": datetime
                }
            }
        });



    const limit = req.limit
    const offset = req.offset

    if(typeof req.section_id !== 'undefined' && req.section_id !== 0) {
        must_array.push({
                        "match": {
                            "section_id": req.section_id
                        }
                    });
    }

    // match with product id --------------
    /* if(typeof req.product_id !== 'undefined' && req.product_id !== 0) {
        must_array.push({
                        "match": {
                            "product_id": req.product_id
                        }
                    });
    } */

    if(typeof req.front_view !== 'undefined' && req.front_view !== 0) {
        must_array.push({
            "match": {
                "front_view": 1
            }
        });
    }

    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": offset,
            "size": limit,
            "sort": [
                { "from_date": { "order": "desc" }},
                { "updated_date": { "order": "desc" }}
            ],
            "query": {
                "bool": {
                    "must": must_array
                }

            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

const sectionItems = async (req) => {
    try {
        const sec_id = req.query.subcat_id ; //165;
        
        var query = `SELECT * FROM ourshopee_section_images WHERE section_id=${sec_id} and status = 1 and country_id=1 order by position asc;
                    
                    SELECT a.*,b.name as subcatname,b.url as subcaturl,c.name as subsubname, c.url as subsuburl, d.name as brandname, d.url as brandurl,sp.id,sp.title_en as heading ,sp.title_ar,sp.title_display,sp.position,sp.status,sp.html_type,sp.main_css,sp.list_css 
                    from ourshopee_section_page sp
                    left join ourshopee_section_page_details a on a.page_id = sp.id
                    left join ourshopee_subcategory b on a.subcategory_id = b.id  
                    left join ourshopee_subsubcategory c on a.sub_sub_cat_id = c.id 
                    left join ourshopee_brands d on a.brand_id = d.id 
                    where sp.section_id=${sec_id} and sp.status = 1 order by sp.position asc; 

                    select product_id from ourshopee_section_products where section_id = ${sec_id} order by product_id asc limit 8;
                    
                    `;

        var results = await db.runQuery(query);
        const section_banner_images = results[0][0];
        const section_page = results[0][1];



        const normalized_section_page = section_page.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)

        const banner_images = section_banner_images.map(Element => {
            return {
                id: Element.id,
                image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/" + Element.image,
                mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/" + Element.mobile_image,
                url: Element.url
            }
        })

        var obj = {};
        obj = {
            ...obj, ["slider_images"]: banner_images
        }

        const product_ids = results[0][2];

        if (product_ids.length > 0) {
            var product_array = product_ids.map((ele) => {
                return ele.product_id
            });

            var productList = await get_products_by_ids_elk(product_array);

            productList = await productList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
                .map((ele) => {
                    return {
                        id: ele.id,
                        name: ele.name,
                        display_price: "AED " + ele.special_price,
                        image: ele.image,
                        url: ele.url,
                        sku: ele.sku
                    }
                });
            obj = {
                ...obj, ["Combo Deals"]: productList
            }
        }

        // normalizing data for the api html_type = 5//
        const categories = normalized_section_page.filter(ele => ele.html_type == 5);

        var aggs_obj = {};
        await Promise.all(categories.map(async (ele) => {
            var subcategory_items = {};
            subcategory_items.main_css = ele.main_css,
                subcategory_items.list_css = ele.list_css,
                subcategory_items.title = ele.heading
            const values = section_dynamic_cond((ele));
            const dynamic_elk_cond = values.elk_cond_Array;
            if (Object.keys("dynamic_elk_cond").length > 0) {
                var dynamic_query = [];
                if (dynamic_elk_cond.hasOwnProperty("subcategory_id")) {
                    var dynamic_query_obj = {
                        "match": {
                            "subcategory_id": dynamic_elk_cond.subcategory_id
                        }
                    }
                    dynamic_query = [...dynamic_query, { ...dynamic_query_obj }]
                }
                if (dynamic_elk_cond.hasOwnProperty("sub_sub_category_id")) {
                    var dynamic_query_obj = {
                        "match": {
                            "sub_sub_category_id": dynamic_elk_cond.sub_sub_category_id
                        }
                    }
                    dynamic_query = [...dynamic_query, { ...dynamic_query_obj }]
                }

                const dynamic_elk_aggregations = {
                    "filter": {
                        "bool": {
                            "must": dynamic_query
                        }

                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "size": 20
                            }
                        }
                    }
                }

                aggs_obj = { ...aggs_obj, [ele.heading]: dynamic_elk_aggregations }

            }

            let domain = (new URL(values.redirection));

        }))

        const client = await config.elasticsearch();
        const result = await client.search({
            index: process.env.es_index,
            body: {
                "size": 0,
                "aggs": aggs_obj
            }
        });

        var array = Object.keys(result.aggregations).map((iop => result.aggregations[iop].docs.hits)).map(ele => {

            return {
                subcategory_name: ele.hits[0]._source.sub_sub_category_name,
                items: ele.hits.map(h => h._source).map(prod => {
                    const values = category_model.price_calculator(prod);

                    return {
                        id: prod.id,
                        name: prod.name,
                        display_price: `AED ${values.display_price}`,
                        old_price: prod.price,
                        image: prod.image,
                        percentage: `${values.percentage}`,
                        url: prod.url,
                        sku: prod.sku
                    }
                })
            }
        })

        obj = { ...obj, ["categories"]: array }

        await Promise.all(normalized_section_page.map(async (ele) => {
            var html_type = ele.html_type;

            if (html_type == 8) {
                const ui = await category_model.call_common_query('perfume_fiesta', sec_id, 4);
                var special_deals = {};
                special_deals.main_css = ele.main_css,
                    special_deals.list_css = ele.list_css,
                    special_deals.title = ele.heading,
                    special_deals.items = ui
                obj = { ...obj, ["special_deals"]: special_deals }
            }

            if (html_type == 1) {
                var subcategory_items = {};
                subcategory_items.main_css = ele.main_css,
                    subcategory_items.list_css = ele.list_css,
                    subcategory_items.title = ele.heading
                const subcategory_filtered_data = section_page.filter(ele => ele.html_type == 1);
                subcategory_items.items = subcategory_filtered_data.map((sub, index) => {
                    const values = section_dynamic_cond(sub);
                    return {
                        id: index + 1,
                        url: values.redirection,
                        sub_category_image: `https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/${sub.en_image}`,
                        sub_category_name: sub.title_en
                    }
                })

                obj = { ...obj, ["shop_by_category"]: subcategory_items }
            }

            if (html_type == 7) {
                const values = section_dynamic_cond(ele);
                const elk_output = await most_picked_items_elk(ele);
                var most_picked_items = {};
                most_picked_items.main_css = ele.main_css,
                    most_picked_items.list_css = ele.list_css,
                    most_picked_items.title = ele.heading
                most_picked_items.items = elk_output.map(ele => {
                    const values = category_model.price_calculator(ele);

                    return {
                        id: ele.id,
                        name: ele.name,
                        display_price: `AED ${values.display_price}`,
                        old_price: ele.price,
                        image: ele.image,
                        percentage: `${values.percentage}`,
                        url: ele.url,
                        sku: ele.sku
                    }
                })

                obj = { ...obj, ["most_picked"]: most_picked_items }
            }

        }))
        return obj
    } catch (err) {
        console.log(err);
        return 'error';
    }
}

const clearance_sale = async (req) => {
    try {
        
        var topItemsList = [];
        if( req.query.page === '1' ) {
            var input_data = {section_id:117, offset:0, limit:4, front_view:1 }
            topItemsList = await get_products_by_section_elk(input_data);
    
            topItemsList = await topItemsList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
                .map((ele) => {
                    var display_price = ele.price - ele.special_price;
    
                    var percentage = display_price / ele.price * 100;
    
                    return {
                        id: ele.id,
                        name: ele.name,
                        display_price: "AED " + ele.special_price,
                        image: ele.image,
                        percentage: Math.round(percentage),
                        old_price: "AED " + ele.price,
                        url: ele.url,
                        sku: ele.sku
                    }
                });
        }
        
        var limit = 20;
        const offset = typeof req.query.page !== 'undefined' ? (parseInt(req.query.page) - 1) * limit : 0

        var input_data = {section_id:117, offset:offset, limit:limit, front_view:0 }
        var itemsList = await get_products_by_section_elk(input_data);
        
        itemsList = await itemsList.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)
            .map((ele) => {
                var display_price = ele.price - ele.special_price;

                var percentage = display_price / ele.price * 100;

                return {
                    id: ele.id,
                    name: ele.name,
                    display_price: "AED " + ele.special_price,
                    image: ele.image,
                    percentage: Math.round(percentage),
                    old_price: "AED " + ele.price,
                    url: ele.url,
                    sku: ele.sku
                }
            });

        
        
        return {top_items: topItemsList, items:itemsList }

    } catch (err) {
        var err_report = "{" + err.stack + "}"
        // sendemailerr(err_report);
        return 'error';
    }
}

const deal_of_the_day = async (req) => {
    try {
        const return_output = {
            "banner_image": [
                {
                    id: 1,
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    url: ""
                }
            ],
            "hot_deals": [
                {
                    "id": 163,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/154937744001.jpg",
                    "countdown": "2022-11-25T08:30:00.000Z",
                    "name": "Xtouch Ocean3 Smart Phone, 2G, Android 4.2.2, MTK Dual Core Cortex A7 1.0GHz, 3.5 inch Display, Dual SIM, Dual Camera, Wifi, White",
                    "url": "Xtouch-Ocean3-Smart-Phone-2G-Android-422-MTK-Dual-Core-Cortex-A7-10GHz-35-inch-Display-Dual-SIM-Dual-Camera-Wifi-White"
                },
                {
                    "id": 60079,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/739861306WhatsApp-Image-2019-05-16-at-10.36.37-AM.jpeg",
                    "countdown": "2022-06-28T06:31:00.000Z",
                    "name": "Level Wireless Bluetooth Neckband Headset with Mic ",
                    "url": "Level-Wireless-Bluetooth-Neckband-Headset-with-Mic-"
                },
                {
                    "id": 52465,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/420329939Untitled-34.jpg",
                    "countdown": "2022-04-21T08:06:00.000Z",
                    "name": "Mr.Cell Gamephone S1",
                    "url": "MrCell-Gamephone-S1"
                },
                {
                    "id": 63527,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/584965240web.png",
                    "countdown": "2022-01-13T13:28:00.000Z",
                    "name": "MI Xiaomi Redmi AirDots Wireless Earbuds",
                    "url": "MI-Xiaomi-Redmi-AirDots-Wireless-Earbuds"
                }
            ],
            "items": [
                {
                    "id": 43307,
                    "name": "JBL Tune 205BT On Ear Bluetooth Headset, Silver",
                    "display_price": "AED 95.00",
                    "old_price": "AED 114.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/68794757983.jpg",
                    "percentage": 17,
                    "url": "JBL-Tune-205BT-On-Ear-Bluetooth-Headset-Silver"
                },
                {
                    "id": 100626,
                    "name": "Saafo Stereo L Type Bullet Headset",
                    "display_price": "AED 61.95",
                    "old_price": "AED 62.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/325094756sf-0230-02.jpg",
                    "percentage": 0,
                    "url": "Saafo-Stereo-L-Type-Bullet-Headset"
                },
                {
                    "id": 101560,
                    "name": "X-cell BT-551 Bluetooth Headset - White",
                    "display_price": "AED 200.54",
                    "old_price": "AED 249.99",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/241252254aa.png",
                    "percentage": 20,
                    "url": "X-cell-BT-551-Bluetooth-Headset-White"
                },
                {
                    "id": 101919,
                    "name": "Lenovo HE05 Hanging Wireless Bluetooth Headphones (BT5.0) With Noise Canceling, Assorted",
                    "display_price": "AED 29.00",
                    "old_price": "AED 59.50",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/566443957web-08.jpg",
                    "percentage": 51,
                    "url": "Lenovo-HE05-Hanging-Wireless-Bluetooth-Headphones-BT50-With-Noise-Canceling-Assorted"
                },
                {
                    "id": 111670,
                    "name": "i500 AirPods Pro Earbuds White",
                    "display_price": "AED 79.00",
                    "old_price": "AED 134.30",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/797096512web-01.jpg",
                    "percentage": 41,
                    "url": "i500-AirPods-Pro-Earbuds-White"
                },
                {
                    "id": 34435,
                    "name": "Jabra Evolve 40 Stereo Headset",
                    "display_price": "AED 469.00",
                    "old_price": "AED 586.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/836415795Jabra-Evolve-40-Stereo-Headset.jpg",
                    "percentage": 20,
                    "url": "Jabra-Evolve-40-Stereo-Headset"
                },
                {
                    "id": 104513,
                    "name": "3 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                    "display_price": "AED 124.95",
                    "old_price": "AED 150.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/472595244OL1548-1-3.jpg",
                    "percentage": 17,
                    "url": "3-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                },
                {
                    "id": 104424,
                    "name": "2 in 1 Combo Offer,I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android phone",
                    "display_price": "AED 36.75",
                    "old_price": "AED 49.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/748533005OR161-1.jpg",
                    "percentage": 25,
                    "url": "2-in-1-Combo-OfferI12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-phone"
                },
                {
                    "id": 107697,
                    "name": "Inpods 12 Wireless Bluetooth 5.0 HIFI Headphones Pop up Touch Earbuds for All Smart Phone Headset Assorted",
                    "display_price": "AED 29.00",
                    "old_price": "AED 69.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/138156133web-01.jpg",
                    "percentage": 58,
                    "url": "Inpods-12-Wireless-Bluetooth-50-HIFI-Headphones-Pop-up-Touch-Earbuds-for-All-Smart-Phone-Headset-Assorted"
                },
                {
                    "id": 116107,
                    "name": "Samsung Galaxy Buds Live Mystic Black",
                    "display_price": "AED 329.00",
                    "old_price": "AED 750.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/513912328web-01.jpg",
                    "percentage": 56,
                    "url": "Samsung-Galaxy-Buds-Live-Mystic-Black"
                },
                {
                    "id": 101559,
                    "name": "X-cell BT-545 Bluetooth Headset - Black",
                    "display_price": "AED 89.25",
                    "old_price": "AED 90.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/821442699zz.png",
                    "percentage": 1,
                    "url": "X-cell-BT-545-Bluetooth-Headset-Black"
                },
            ],
            "trending_products": [{
                "id": 104515,
                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                "display_price": "AED 313.95",
                "old_price": "AED 350.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                "percentage": 10,
                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
            },
            {
                "id": 86143,
                "name": "Sony MDR-ZX110 Headphone",
                "display_price": "AED 103.95",
                "old_price": "AED 109.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                "percentage": 5,
                "url": "Sony-MDR-ZX110-Headphone"
            },
            {
                "id": 86154,
                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                "display_price": "AED 61.95",
                "old_price": "AED 99.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                "percentage": 37,
                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
            },
            {
                "id": 87237,
                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                "display_price": "AED 51.45",
                "old_price": "AED 99.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                "percentage": 48,
                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
            },
            {
                "id": 104418,
                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                "display_price": "AED 82.95",
                "old_price": "AED 120.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                "percentage": 31,
                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
            },
            {
                "id": 61599,
                "name": "Logitech Headset Bluetooth H800,981-000338",
                "display_price": "AED 599.00",
                "old_price": "AED 639.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                "percentage": 6,
                "url": "Logitech-Headset-Bluetooth-H800981-000338"
            },
            {
                "id": 102840,
                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                "display_price": "AED 11.00",
                "old_price": "AED 13.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                "percentage": 15,
                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
            },
            {
                "id": 34436,
                "name": "Jabra Evolve 65 Stereo Headset",
                "display_price": "AED 786.00",
                "old_price": "AED 982.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                "percentage": 20,
                "url": "Jabra-Evolve-65-Stereo-Headset"
            },
            {
                "id": 46254,
                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                "display_price": "AED 29.00",
                "old_price": "AED 38.27",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                "percentage": 24,
                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
            }]
        }
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}
const top_selling_products = async (req) => {
    try {
        const return_output = {
            "banner_image": [
                {
                    id: 1,
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    url: ""
                }
            ],
            "items": [
                {
                    "id": 163,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/154937744001.jpg",
                    "countdown": "2022-11-25T08:30:00.000Z",
                    "name": "Xtouch Ocean3 Smart Phone, 2G, Android 4.2.2, MTK Dual Core Cortex A7 1.0GHz, 3.5 inch Display, Dual SIM, Dual Camera, Wifi, White",
                    "url": "Xtouch-Ocean3-Smart-Phone-2G-Android-422-MTK-Dual-Core-Cortex-A7-10GHz-35-inch-Display-Dual-SIM-Dual-Camera-Wifi-White"
                },
                {
                    "id": 60079,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/739861306WhatsApp-Image-2019-05-16-at-10.36.37-AM.jpeg",
                    "countdown": "2022-06-28T06:31:00.000Z",
                    "name": "Level Wireless Bluetooth Neckband Headset with Mic ",
                    "url": "Level-Wireless-Bluetooth-Neckband-Headset-with-Mic-"
                },
                {
                    "id": 52465,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/420329939Untitled-34.jpg",
                    "countdown": "2022-04-21T08:06:00.000Z",
                    "name": "Mr.Cell Gamephone S1",
                    "url": "MrCell-Gamephone-S1"
                },
                {
                    "id": 63527,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/584965240web.png",
                    "countdown": "2022-01-13T13:28:00.000Z",
                    "name": "MI Xiaomi Redmi AirDots Wireless Earbuds",
                    "url": "MI-Xiaomi-Redmi-AirDots-Wireless-Earbuds"
                }
            ],
            "top_Selling_products": [
                {
                    "id": 43307,
                    "name": "JBL Tune 205BT On Ear Bluetooth Headset, Silver",
                    "display_price": "AED 95.00",
                    "old_price": "AED 114.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/68794757983.jpg",
                    "percentage": 17,
                    "url": "JBL-Tune-205BT-On-Ear-Bluetooth-Headset-Silver"
                },
                {
                    "id": 100626,
                    "name": "Saafo Stereo L Type Bullet Headset",
                    "display_price": "AED 61.95",
                    "old_price": "AED 62.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/325094756sf-0230-02.jpg",
                    "percentage": 0,
                    "url": "Saafo-Stereo-L-Type-Bullet-Headset"
                },
                {
                    "id": 101560,
                    "name": "X-cell BT-551 Bluetooth Headset - White",
                    "display_price": "AED 200.54",
                    "old_price": "AED 249.99",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/241252254aa.png",
                    "percentage": 20,
                    "url": "X-cell-BT-551-Bluetooth-Headset-White"
                },
                {
                    "id": 101919,
                    "name": "Lenovo HE05 Hanging Wireless Bluetooth Headphones (BT5.0) With Noise Canceling, Assorted",
                    "display_price": "AED 29.00",
                    "old_price": "AED 59.50",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/566443957web-08.jpg",
                    "percentage": 51,
                    "url": "Lenovo-HE05-Hanging-Wireless-Bluetooth-Headphones-BT50-With-Noise-Canceling-Assorted"
                },
                {
                    "id": 111670,
                    "name": "i500 AirPods Pro Earbuds White",
                    "display_price": "AED 79.00",
                    "old_price": "AED 134.30",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/797096512web-01.jpg",
                    "percentage": 41,
                    "url": "i500-AirPods-Pro-Earbuds-White"
                },
                {
                    "id": 34435,
                    "name": "Jabra Evolve 40 Stereo Headset",
                    "display_price": "AED 469.00",
                    "old_price": "AED 586.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/836415795Jabra-Evolve-40-Stereo-Headset.jpg",
                    "percentage": 20,
                    "url": "Jabra-Evolve-40-Stereo-Headset"
                },
                {
                    "id": 104513,
                    "name": "3 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                    "display_price": "AED 124.95",
                    "old_price": "AED 150.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/472595244OL1548-1-3.jpg",
                    "percentage": 17,
                    "url": "3-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                },
                {
                    "id": 104424,
                    "name": "2 in 1 Combo Offer,I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android phone",
                    "display_price": "AED 36.75",
                    "old_price": "AED 49.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/748533005OR161-1.jpg",
                    "percentage": 25,
                    "url": "2-in-1-Combo-OfferI12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-phone"
                },
                {
                    "id": 107697,
                    "name": "Inpods 12 Wireless Bluetooth 5.0 HIFI Headphones Pop up Touch Earbuds for All Smart Phone Headset Assorted",
                    "display_price": "AED 29.00",
                    "old_price": "AED 69.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/138156133web-01.jpg",
                    "percentage": 58,
                    "url": "Inpods-12-Wireless-Bluetooth-50-HIFI-Headphones-Pop-up-Touch-Earbuds-for-All-Smart-Phone-Headset-Assorted"
                },
                {
                    "id": 116107,
                    "name": "Samsung Galaxy Buds Live Mystic Black",
                    "display_price": "AED 329.00",
                    "old_price": "AED 750.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/513912328web-01.jpg",
                    "percentage": 56,
                    "url": "Samsung-Galaxy-Buds-Live-Mystic-Black"
                },
                {
                    "id": 101559,
                    "name": "X-cell BT-545 Bluetooth Headset - Black",
                    "display_price": "AED 89.25",
                    "old_price": "AED 90.00",
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/821442699zz.png",
                    "percentage": 1,
                    "url": "X-cell-BT-545-Bluetooth-Headset-Black"
                },
            ],
            "trending_products": [{
                "id": 104515,
                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                "display_price": "AED 313.95",
                "old_price": "AED 350.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                "percentage": 10,
                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
            },
            {
                "id": 86143,
                "name": "Sony MDR-ZX110 Headphone",
                "display_price": "AED 103.95",
                "old_price": "AED 109.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                "percentage": 5,
                "url": "Sony-MDR-ZX110-Headphone"
            },
            {
                "id": 86154,
                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                "display_price": "AED 61.95",
                "old_price": "AED 99.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                "percentage": 37,
                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
            },
            {
                "id": 87237,
                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                "display_price": "AED 51.45",
                "old_price": "AED 99.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                "percentage": 48,
                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
            },
            {
                "id": 104418,
                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                "display_price": "AED 82.95",
                "old_price": "AED 120.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                "percentage": 31,
                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
            },
            {
                "id": 61599,
                "name": "Logitech Headset Bluetooth H800,981-000338",
                "display_price": "AED 599.00",
                "old_price": "AED 639.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                "percentage": 6,
                "url": "Logitech-Headset-Bluetooth-H800981-000338"
            },
            {
                "id": 102840,
                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                "display_price": "AED 11.00",
                "old_price": "AED 13.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                "percentage": 15,
                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
            },
            {
                "id": 34436,
                "name": "Jabra Evolve 65 Stereo Headset",
                "display_price": "AED 786.00",
                "old_price": "AED 982.00",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                "percentage": 20,
                "url": "Jabra-Evolve-65-Stereo-Headset"
            },
            {
                "id": 46254,
                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                "display_price": "AED 29.00",
                "old_price": "AED 38.27",
                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                "percentage": 24,
                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
            }]
        }
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}

const saver_zone = async (req) => {
    try {
        const return_output = {
            "banner_image": [
                {
                    id: 1,
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/58846492Saver-Zone.gif",
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/58846492Saver-Zone.gif",
                    url: ""
                }
            ],
            "top_items": [
                {
                    "id": 163,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/154937744001.jpg",
                    "countdown": "2022-11-25T08:30:00.000Z",
                    "name": "Xtouch Ocean3 Smart Phone, 2G, Android 4.2.2, MTK Dual Core Cortex A7 1.0GHz, 3.5 inch Display, Dual SIM, Dual Camera, Wifi, White",
                    "url": "Xtouch-Ocean3-Smart-Phone-2G-Android-422-MTK-Dual-Core-Cortex-A7-10GHz-35-inch-Display-Dual-SIM-Dual-Camera-Wifi-White"
                },
                {
                    "id": 60079,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/739861306WhatsApp-Image-2019-05-16-at-10.36.37-AM.jpeg",
                    "countdown": "2022-06-28T06:31:00.000Z",
                    "name": "Level Wireless Bluetooth Neckband Headset with Mic ",
                    "url": "Level-Wireless-Bluetooth-Neckband-Headset-with-Mic-"
                },
                {
                    "id": 52465,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/420329939Untitled-34.jpg",
                    "countdown": "2022-04-21T08:06:00.000Z",
                    "name": "Mr.Cell Gamephone S1",
                    "url": "MrCell-Gamephone-S1"
                },
                {
                    "id": 63527,
                    "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/584965240web.png",
                    "countdown": "2022-01-13T13:28:00.000Z",
                    "name": "MI Xiaomi Redmi AirDots Wireless Earbuds",
                    "url": "MI-Xiaomi-Redmi-AirDots-Wireless-Earbuds"
                }
            ],
            "section_items": [
                {
                    "banner": "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/571045354Dealoftheday-1.jpg",
                    "items": [
                        {
                            "id": 43307,
                            "name": "JBL Tune 205BT On Ear Bluetooth Headset, Silver",
                            "display_price": "AED 95.00",
                            "old_price": "AED 114.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/68794757983.jpg",
                            "percentage": 17,
                            "url": "JBL-Tune-205BT-On-Ear-Bluetooth-Headset-Silver"
                        },
                        {
                            "id": 100626,
                            "name": "Saafo Stereo L Type Bullet Headset",
                            "display_price": "AED 61.95",
                            "old_price": "AED 62.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/325094756sf-0230-02.jpg",
                            "percentage": 0,
                            "url": "Saafo-Stereo-L-Type-Bullet-Headset"
                        },
                        {
                            "id": 101560,
                            "name": "X-cell BT-551 Bluetooth Headset - White",
                            "display_price": "AED 200.54",
                            "old_price": "AED 249.99",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/241252254aa.png",
                            "percentage": 20,
                            "url": "X-cell-BT-551-Bluetooth-Headset-White"
                        },
                        {
                            "id": 101919,
                            "name": "Lenovo HE05 Hanging Wireless Bluetooth Headphones (BT5.0) With Noise Canceling, Assorted",
                            "display_price": "AED 29.00",
                            "old_price": "AED 59.50",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/566443957web-08.jpg",
                            "percentage": 51,
                            "url": "Lenovo-HE05-Hanging-Wireless-Bluetooth-Headphones-BT50-With-Noise-Canceling-Assorted"
                        },
                        {
                            "id": 111670,
                            "name": "i500 AirPods Pro Earbuds White",
                            "display_price": "AED 79.00",
                            "old_price": "AED 134.30",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/797096512web-01.jpg",
                            "percentage": 41,
                            "url": "i500-AirPods-Pro-Earbuds-White"
                        },
                        {
                            "id": 34435,
                            "name": "Jabra Evolve 40 Stereo Headset",
                            "display_price": "AED 469.00",
                            "old_price": "AED 586.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/836415795Jabra-Evolve-40-Stereo-Headset.jpg",
                            "percentage": 20,
                            "url": "Jabra-Evolve-40-Stereo-Headset"
                        },
                        {
                            "id": 104513,
                            "name": "3 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                            "display_price": "AED 124.95",
                            "old_price": "AED 150.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/472595244OL1548-1-3.jpg",
                            "percentage": 17,
                            "url": "3-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                        },
                        {
                            "id": 104424,
                            "name": "2 in 1 Combo Offer,I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android phone",
                            "display_price": "AED 36.75",
                            "old_price": "AED 49.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/748533005OR161-1.jpg",
                            "percentage": 25,
                            "url": "2-in-1-Combo-OfferI12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-phone"
                        },
                        {
                            "id": 107697,
                            "name": "Inpods 12 Wireless Bluetooth 5.0 HIFI Headphones Pop up Touch Earbuds for All Smart Phone Headset Assorted",
                            "display_price": "AED 29.00",
                            "old_price": "AED 69.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/138156133web-01.jpg",
                            "percentage": 58,
                            "url": "Inpods-12-Wireless-Bluetooth-50-HIFI-Headphones-Pop-up-Touch-Earbuds-for-All-Smart-Phone-Headset-Assorted"
                        },
                        {
                            "id": 116107,
                            "name": "Samsung Galaxy Buds Live Mystic Black",
                            "display_price": "AED 329.00",
                            "old_price": "AED 750.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/513912328web-01.jpg",
                            "percentage": 56,
                            "url": "Samsung-Galaxy-Buds-Live-Mystic-Black"
                        },
                        {
                            "id": 101559,
                            "name": "X-cell BT-545 Bluetooth Headset - Black",
                            "display_price": "AED 89.25",
                            "old_price": "AED 90.00",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/821442699zz.png",
                            "percentage": 1,
                            "url": "X-cell-BT-545-Bluetooth-Headset-Black"
                        },
                    ]
                }, {
                    "banner": "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/600871227Bundle-Offer.jpg",
                    "items": [{
                        "id": 104515,
                        "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                        "display_price": "AED 313.95",
                        "old_price": "AED 350.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                        "percentage": 10,
                        "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                    },
                    {
                        "id": 86143,
                        "name": "Sony MDR-ZX110 Headphone",
                        "display_price": "AED 103.95",
                        "old_price": "AED 109.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                        "percentage": 5,
                        "url": "Sony-MDR-ZX110-Headphone"
                    },
                    {
                        "id": 86154,
                        "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                        "display_price": "AED 61.95",
                        "old_price": "AED 99.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                        "percentage": 37,
                        "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
                    },
                    {
                        "id": 87237,
                        "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                        "display_price": "AED 51.45",
                        "old_price": "AED 99.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                        "percentage": 48,
                        "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
                    },
                    {
                        "id": 104418,
                        "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                        "display_price": "AED 82.95",
                        "old_price": "AED 120.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                        "percentage": 31,
                        "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
                    },
                    {
                        "id": 61599,
                        "name": "Logitech Headset Bluetooth H800,981-000338",
                        "display_price": "AED 599.00",
                        "old_price": "AED 639.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                        "percentage": 6,
                        "url": "Logitech-Headset-Bluetooth-H800981-000338"
                    },
                    {
                        "id": 102840,
                        "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                        "display_price": "AED 11.00",
                        "old_price": "AED 13.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                        "percentage": 15,
                        "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
                    },
                    {
                        "id": 34436,
                        "name": "Jabra Evolve 65 Stereo Headset",
                        "display_price": "AED 786.00",
                        "old_price": "AED 982.00",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                        "percentage": 20,
                        "url": "Jabra-Evolve-65-Stereo-Headset"
                    },
                    {
                        "id": 46254,
                        "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                        "display_price": "AED 29.00",
                        "old_price": "AED 38.27",
                        "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                        "percentage": 24,
                        "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
                    }]
                }
            ],
            "categories": [
                {
                    title: "SMARTPHONES",
                    images: [
                        {
                            id: 1,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/837175062Mobiles-Budget.jpg"
                        },
                        {
                            id: 2,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/229893077Mobiles-Flagship.jpg"
                        },
                        {
                            id: 3,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/170481316Mobiles-Midrange.jpg"
                        },
                        {
                            id: 4,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/229893077Mobiles-Flagship.jpg"
                        }
                    ],
                    subcategories: [
                        {
                            subcategory_name: "Mobiles",
                            items: [{
                                "id": 104515,
                                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                                "display_price": "AED 313.95",
                                "old_price": "AED 350.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                                "percentage": 10,
                                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                            },
                            {
                                "id": 86143,
                                "name": "Sony MDR-ZX110 Headphone",
                                "display_price": "AED 103.95",
                                "old_price": "AED 109.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                                "percentage": 5,
                                "url": "Sony-MDR-ZX110-Headphone"
                            },
                            {
                                "id": 86154,
                                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                                "display_price": "AED 61.95",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                                "percentage": 37,
                                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
                            },
                            {
                                "id": 87237,
                                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                                "display_price": "AED 51.45",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                                "percentage": 48,
                                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
                            },
                            {
                                "id": 104418,
                                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                                "display_price": "AED 82.95",
                                "old_price": "AED 120.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                                "percentage": 31,
                                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
                            },
                            {
                                "id": 61599,
                                "name": "Logitech Headset Bluetooth H800,981-000338",
                                "display_price": "AED 599.00",
                                "old_price": "AED 639.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                                "percentage": 6,
                                "url": "Logitech-Headset-Bluetooth-H800981-000338"
                            },
                            {
                                "id": 102840,
                                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                                "display_price": "AED 11.00",
                                "old_price": "AED 13.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                                "percentage": 15,
                                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
                            },
                            {
                                "id": 34436,
                                "name": "Jabra Evolve 65 Stereo Headset",
                                "display_price": "AED 786.00",
                                "old_price": "AED 982.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                                "percentage": 20,
                                "url": "Jabra-Evolve-65-Stereo-Headset"
                            },
                            {
                                "id": 46254,
                                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                                "display_price": "AED 29.00",
                                "old_price": "AED 38.27",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                                "percentage": 24,
                                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
                            }]
                        },
                        {
                            subcategory_name: "Tablets",
                            items: [{
                                "id": 104515,
                                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                                "display_price": "AED 313.95",
                                "old_price": "AED 350.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                                "percentage": 10,
                                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                            },
                            {
                                "id": 86143,
                                "name": "Sony MDR-ZX110 Headphone",
                                "display_price": "AED 103.95",
                                "old_price": "AED 109.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                                "percentage": 5,
                                "url": "Sony-MDR-ZX110-Headphone"
                            },
                            {
                                "id": 86154,
                                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                                "display_price": "AED 61.95",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                                "percentage": 37,
                                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
                            },
                            {
                                "id": 87237,
                                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                                "display_price": "AED 51.45",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                                "percentage": 48,
                                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
                            },
                            {
                                "id": 104418,
                                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                                "display_price": "AED 82.95",
                                "old_price": "AED 120.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                                "percentage": 31,
                                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
                            },
                            {
                                "id": 61599,
                                "name": "Logitech Headset Bluetooth H800,981-000338",
                                "display_price": "AED 599.00",
                                "old_price": "AED 639.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                                "percentage": 6,
                                "url": "Logitech-Headset-Bluetooth-H800981-000338"
                            },
                            {
                                "id": 102840,
                                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                                "display_price": "AED 11.00",
                                "old_price": "AED 13.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                                "percentage": 15,
                                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
                            },
                            {
                                "id": 34436,
                                "name": "Jabra Evolve 65 Stereo Headset",
                                "display_price": "AED 786.00",
                                "old_price": "AED 982.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                                "percentage": 20,
                                "url": "Jabra-Evolve-65-Stereo-Headset"
                            },
                            {
                                "id": 46254,
                                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                                "display_price": "AED 29.00",
                                "old_price": "AED 38.27",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                                "percentage": 24,
                                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
                            }]
                        },
                    ]
                },
                {
                    title: "SMART WEARABLES",
                    images: [
                        {
                            id: 1,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/807413375Smartwatches-2.jpeg"
                        },
                        {
                            id: 2,
                            image: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/590490319Smartwatch-Accessories-2.jpeg"
                        }
                    ],
                    subcategories: [
                        {
                            subcategory_name: "Smart Wearable",
                            items: [{
                                "id": 104515,
                                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                                "display_price": "AED 313.95",
                                "old_price": "AED 350.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                                "percentage": 10,
                                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                            },
                            {
                                "id": 86143,
                                "name": "Sony MDR-ZX110 Headphone",
                                "display_price": "AED 103.95",
                                "old_price": "AED 109.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                                "percentage": 5,
                                "url": "Sony-MDR-ZX110-Headphone"
                            },
                            {
                                "id": 86154,
                                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                                "display_price": "AED 61.95",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                                "percentage": 37,
                                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
                            },
                            {
                                "id": 87237,
                                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                                "display_price": "AED 51.45",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                                "percentage": 48,
                                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
                            },
                            {
                                "id": 104418,
                                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                                "display_price": "AED 82.95",
                                "old_price": "AED 120.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                                "percentage": 31,
                                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
                            },
                            {
                                "id": 61599,
                                "name": "Logitech Headset Bluetooth H800,981-000338",
                                "display_price": "AED 599.00",
                                "old_price": "AED 639.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                                "percentage": 6,
                                "url": "Logitech-Headset-Bluetooth-H800981-000338"
                            },
                            {
                                "id": 102840,
                                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                                "display_price": "AED 11.00",
                                "old_price": "AED 13.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                                "percentage": 15,
                                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
                            },
                            {
                                "id": 34436,
                                "name": "Jabra Evolve 65 Stereo Headset",
                                "display_price": "AED 786.00",
                                "old_price": "AED 982.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                                "percentage": 20,
                                "url": "Jabra-Evolve-65-Stereo-Headset"
                            },
                            {
                                "id": 46254,
                                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                                "display_price": "AED 29.00",
                                "old_price": "AED 38.27",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                                "percentage": 24,
                                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
                            }]
                        },
                        {
                            subcategory_name: "Tablets",
                            items: [{
                                "id": 104515,
                                "name": "10 IN 1 Bundle Offer Level Wireless Bluetooth Neckband Headset with Mic",
                                "display_price": "AED 313.95",
                                "old_price": "AED 350.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/69795533OL1548-1-10.jpg",
                                "percentage": 10,
                                "url": "10-IN-1-Bundle-Offer-Level-Wireless-Bluetooth-Neckband-Headset-with-Mic"
                            },
                            {
                                "id": 86143,
                                "name": "Sony MDR-ZX110 Headphone",
                                "display_price": "AED 103.95",
                                "old_price": "AED 109.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/27767739802441517.png",
                                "percentage": 5,
                                "url": "Sony-MDR-ZX110-Headphone"
                            },
                            {
                                "id": 86154,
                                "name": "Sony MDREX15APWZ/PBZ Ear Phone With Mic",
                                "display_price": "AED 61.95",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/21476887302443260.png",
                                "percentage": 37,
                                "url": "Sony-MDREX15APWZPBZ-Ear-Phone-With-Mic"
                            },
                            {
                                "id": 87237,
                                "name": "Trevi DJ 677 M Headphones with Microphone, Blue",
                                "display_price": "AED 51.45",
                                "old_price": "AED 99.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/811674908152228.png",
                                "percentage": 48,
                                "url": "Trevi-DJ-677-M-Headphones-with-Microphone-Blue"
                            },
                            {
                                "id": 104418,
                                "name": "5 IN 1 Bundle Offer, I12 TWS Bluetooth Earphone Pop-up Wireless Earphones Charging Case for iPhone Android Phone",
                                "display_price": "AED 82.95",
                                "old_price": "AED 120.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/512340269OR161-1-5.jpg",
                                "percentage": 31,
                                "url": "5-IN-1-Bundle-Offer-I12-TWS-Bluetooth-Earphone-Pop-up-Wireless-Earphones-Charging-Case-for-iPhone-Android-Phone"
                            },
                            {
                                "id": 61599,
                                "name": "Logitech Headset Bluetooth H800,981-000338",
                                "display_price": "AED 599.00",
                                "old_price": "AED 639.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/59703244Untitled-2.jpg",
                                "percentage": 6,
                                "url": "Logitech-Headset-Bluetooth-H800981-000338"
                            },
                            {
                                "id": 102840,
                                "name": "MT Multi Color 450AP Foldable Metal Texture Extra Bass 3.5mm Wired Stereo Headset",
                                "display_price": "AED 11.00",
                                "old_price": "AED 13.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/493545192muilty-a.jpg",
                                "percentage": 15,
                                "url": "MT-Multi-Color-450AP-Foldable-Metal-Texture-Extra-Bass-35mm-Wired-Stereo-Headset"
                            },
                            {
                                "id": 34436,
                                "name": "Jabra Evolve 65 Stereo Headset",
                                "display_price": "AED 786.00",
                                "old_price": "AED 982.00",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/779437354Jabra-Evolve-65-Stereo-Headset.jpg",
                                "percentage": 20,
                                "url": "Jabra-Evolve-65-Stereo-Headset"
                            },
                            {
                                "id": 46254,
                                "name": "P47 Wireless Bluetooth Headset with Microphone, Assorted Color",
                                "display_price": "AED 29.00",
                                "old_price": "AED 38.27",
                                "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/565730850web-1.jpg",
                                "percentage": 24,
                                "url": "P47-Wireless-Bluetooth-Headset-with-Microphone-Assorted-Color"
                            }]
                        },
                    ]
                },
            ]
        }
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}


module.exports = {
    sectionItems: sectionItems,
    clearance_sale: clearance_sale,
    deal_of_the_day: deal_of_the_day,
    top_selling_products: top_selling_products,
    saver_zone: saver_zone,
    get_products_by_section_elk: get_products_by_section_elk
}