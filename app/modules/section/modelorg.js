const config = require('../../config');
const db = require('../../db');
const sendemailerr = require('../../helpers/email').emailerr;
const category_model = require('../category/model')
const moment = require('moment');
const momenttimezone = require('moment-timezone');
const datetimeHelper = require('../../helpers/dateTimeHelper');

const section_dynamic_cond = (sub) => {
    if (sub['en_redirection'] != '' ) {
        var redirection = sub['en_redirection'];
    } else if (sub['subcategory_id'] != 0 && sub['sub_sub_cat_id'] != 0) {
        var redirection = `https://www.ourshopee.com/products-subcategory/${sub['subcaturl']}/${sub['subsuburl']}/`;
    } else if (sub['subcategory_id'] != 0 && sub['brand_id'] != 0) {
        var redirection = `https://www.ourshopee.com/brands/${sub['brandurl']}/${sub['subcaturl']}/`;
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
                                    "gte": 1
                                }

                            }
                        },
                        {
                            "range": {
                                "quantity": {
                                    "gte": 1
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
            "size": 10000,
            "query": {
                "bool": {
                    "must": [
                        { "terms": { "id": products_ids } },
                        { "match": { "stock": "In stock" } },
                        { "match": { "status": 1 } },
                        {
                            "range": {
                                "quantity": {
                                    "gte": "1"
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

const getSpecialDealsProducts = async (sec_id, limit, from) => {
    const client = await config.elasticsearch();
    var now = new Date();

    var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
    var datetime = moment.utc(dateStringWithTime).toISOString()

    if (sec_id == 29) {
        var dynamic_cond = {
            "range": {
                "from_date": {
                    "lte": datetime
                }
            }
        }
        var sort_dynamic_cond = { "from_date": "desc" }
    } if (sec_id == 165 || sec_id == 16 || sec_id == 19 || sec_id == 82) {
        var dynamic_cond = {
            "range": {
                "offer_from": {
                    "lte": datetime
                }
            }
        }
        if (limit == 12) {
            var sort_dynamic_cond = { "id": "desc" }
        } else {
            var sort_dynamic_cond = { "offer_from": "desc" }
        }
    }

    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": from,
            "size": limit,
            "query": {
                "bool": {
                    "must": [
                        {
                            "terms": {
                                "section_id": [sec_id]
                            }
                        },
                        {
                            "match": {
                                "stock": "In stock",
                            }
                        },
                        {
                            "match": {
                                "status": 1,
                            }
                        },
                        {
                            "range": {
                                "quantity": {
                                    "gte": 1
                                }
                            }
                        }

                    ]
                }
            },
            "sort": sort_dynamic_cond
        }
    });
    return result.hits.hits.map(h => h._source);
}

const getComboDealsProducts = async (sec_id, limit, from) => {
    const client = await config.elasticsearch();
    var now = new Date();

    var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
    var datetime = moment.utc(dateStringWithTime).toISOString()

    const result = await client.search({
        index: process.env.es_index,
        body: {
            "from": from,
            "size": limit,
            "query": {
                "bool": {
                    "must": [
                        {
                            "terms": {
                                "section_id": [sec_id]
                            }
                        },
                        {
                            "match": {
                                "type_id": "2"
                            }
                        }

                    ]
                }
            },
            "sort": [
                { "from_date": "desc" },
                { "from_date": "desc" }
            ]
        }
    });
    return result.hits.hits.map(h => h._source);
}

//----------------------------------------------------------------------ok
const get_products_by_section_elk = async (req) => {
    var must_array = [{
        "match": {
            "status": 1
        }
    }];
    var sort_order = [];

    sort_order.push({ "from_date": { "order": "desc" } });
    sort_order.push({ "updated_date": { "order": "desc" } });

    if (typeof req.condition_from_date !== 'undefined' && req.condition_from_date === false) {

    } else {
        var now = new Date();

        var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
        var datetime = moment.utc(dateStringWithTime).toISOString()

        // must_array.push({
        //     "range": {
        //         "from_date": {
        //             "lte": datetime
        //         }
        //     }
        // });
    }

    if (typeof req.condition_quantity !== 'undefined' && req.condition_quantity === true) {
        must_array.push({
            "range": {
                "special_price": {
                    "gte": 1
                }
            }
        });
        must_array.push({
            "range": {
                "quantity": {
                    "gte": 1
                }
            }
        });
        must_array.push({
            "match": {
                "stock": "In stock"
            }
        });

        var sort_order = [];

        sort_order.push({ "id": { "order": "desc" } });
    }

    const limit = req.limit
    const offset = req.offset

    if (typeof req.section_id !== 'undefined' && req.section_id !== 0) {
        must_array.push({
            "match": {
                "section_id": req.section_id
            }
        });
    }

    // match with product id --------------
    if (typeof req.product_id !== 'undefined' && req.product_id !== 0) {
        must_array.push({
            "match": {
                "product_id": req.product_id
            }
        });
    }

    if (typeof req.front_view !== 'undefined' && req.front_view !== 0) {
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
            "sort": sort_order,
            "query": {
                "bool": {
                    "must": must_array
                }
            }
        }
    });

    return result.hits.hits.map(h => h._source);
}

const sectionImages = async (sec_id) => {
    var query = `SELECT * FROM ourshopee_section_images WHERE section_id=${sec_id} and status = 1 and country_id=1 order by position asc;`;
    try {
        var result = await db.runQuery(query);
        result = result[0];

        const output = result.map(Element => {
            if (Element.url != '' && Element.url != '#') {
                var domain = (new URL(Element.url));
                var pathname = domain.pathname
            } else {
                var pathname = Element.url
            }
            return {
                id: Element.id,
                image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/" + Element.image + "?",
                mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_images/" + Element.mobile_image + "?",
                url: pathname
            }
        })
        return output
    } catch (err) {
        return 'error';
    }
}

const getInfinteScrollItems = async (req) => {
    try {
        const client = await config.elasticsearch();
        const result = await client.search({
            index: process.env.es_index,
            body: {
                "from": (req.query.page == '1' ? 0 : ((req.query.page - 1) * 20)),
                "size": 20,
                "query": {
                    "function_score": {
                        "query": {
                            "bool": {
                                "must": [
                                    {
                                        "match": { "stock": "In stock" }
                                    },
                                    {
                                        "match": { "status": 1 }
                                    },
                                    {
                                        "match": {
                                            "subcategory_id": 34
                                        }
                                    },
                                    {
                                        "range": {
                                            "quantity": {
                                                "gte": 1
                                            }

                                        }
                                    }
                                ]
                            }
                        },
                        "random_score": {}
                    }
                }
            }
        });

        const products = result.hits.hits.map(h => h._source);

        return products.map(ele => {
            const values = category_model.price_calculator(ele);

            return {
                id: ele.id,
                name: ele.name,
                display_price: `AED ${values.display_price}`,
                old_price: `AED ${ele.price}`,
                image: ele.image,
                percentage: `${values.percentage}`,
                url: ele.url,
                sku: ele.sku
            }
        })
    } catch (err) {
        return 'error';
    }
}

const sectionItems = async (req) => {
    try {
        const sec_id = req.query.subcat_id; //165;
        var query = `
                    
                    SELECT a.*,b.name as subcatname,b.url as subcaturl,c.name as subsubname, c.url as subsuburl, d.name as brandname, d.url as brandurl,sp.id,sp.title_en as heading ,sp.title_ar,sp.title_display,sp.position,sp.status,sp.html_type,sp.main_css,sp.list_css 
                    from ourshopee_section_page sp
                    left join ourshopee_section_page_details a on a.page_id = sp.id
                    left join ourshopee_subcategory b on a.subcategory_id = b.id  
                    left join ourshopee_subsubcategory c on a.sub_sub_cat_id = c.id 
                    left join ourshopee_brands d on a.brand_id = d.id 
                    where sp.section_id=${sec_id} and sp.status = 1 order by sp.position asc; 

                    select product_id from ourshopee_section_products where section_id = ${sec_id} order by position limit 8;
                    
                    `;

        var results = await db.runQuery(query);
        const banner_images = await sectionImages(sec_id);
        const section_page = results[0][0];

        const normalized_section_page = section_page.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)

        var obj = {};
        obj = {
            ...obj, ["slider_images"]: banner_images
        }

        const product_ids = results[0][1];

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
                var dynamic_query = [
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
                    { "range": { "quantity": { "gte": 1 } } }
                ];
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
                        old_price: `AED ${prod.price}`,
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
                const ui = await getSpecialDealsProducts(165, 4, 0)

                var special_deals = {};
                special_deals.main_css = ele.main_css,
                    special_deals.list_css = ele.list_css,
                    special_deals.title = ele.heading,
                    special_deals.items = ui.map((item) => {
                        const values = category_model.price_calculator(item);

                        return {
                            id: item.id,
                            name: item.name,
                            display_price: `AED ${values.display_price}`,
                            countdown: moment(item.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                            old_price: `AED ${item.price}`,
                            image: item.image,
                            percentage: `${values.percentage}`,
                            url: item.url,
                            sku: item.sku
                        }
                    })
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
                    let domain = (new URL(values.redirection));
                    return {
                        id: index + 1,
                        url: domain.pathname,
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
                        old_price: `AED ${ele.price}`,
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
        return 'error';
    }
}

const clearance_sale = async (req) => {
    try {

        var topItemsList = [];
        if (req.query.page === '1') {
            var bannerImages = await sectionImages(117);
            var input_data = { section_id: 117, offset: 0, limit: 4, front_view: 1, condition_from_date: false }
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
                });;
        }

        var limit = 20;
        const offset = typeof req.query.page !== 'undefined' ? (parseInt(req.query.page) - 1) * limit : 0

        var input_data = { section_id: 117, offset: offset, limit: limit, front_view: 0, condition_from_date: false }
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

        return { top_items: topItemsList, items: itemsList, bannerImages: bannerImages }

    } catch (err) {
        var err_report = "{" + err.stack + "}"
        // sendemailerr(err_report);
        return 'error';
    }
}

const blogs = async (req) => {
    try {

        var query = `select * from ourshopee_blogcategory order by id asc;
        select * from ourshopee_blog where status = 1 ORDER BY display_date DESC LIMIT 15;
        `;

        var results = await db.runQuery(query);

        if (results[0].length > 0) {
            return {
                "Categories": results[0][0].map(ele => {
                    return {
                        id: ele.id,
                        name: ele.name,
                        url: ele.url
                    }
                }),
                "Recents": results[0][1].map(ele => {
                    return {
                        id: ele.id,
                        title: ele.title,
                        display_date: ele.display_date,
                        image: "https://ourshopee.com/ourshopee-img/ourshopee_blog/thump/" + ele.image,
                        description: ele.description,
                        url: ele.url,
                    }
                })
            }

        }

    } catch (err) {
        var err_report = "{" + err.stack + "}"
        // sendemailerr(err_report);
        return 'error';
    }
}

const blogByCatId = async (req) => {
    try {

        if (req.query.hasOwnProperty("id")) {
            var query = `select * from ourshopee_blog where status = 1 and category_id = ${req.query.id} ORDER BY display_date DESC ;
            select * from ourshopee_blog where status = 1 ORDER BY display_date DESC LIMIT 5
            `;
        } else {
            var query = `select * from ourshopee_blog where id = ${req.query.blogId};
            select * from ourshopee_blog where status = 1 ORDER BY display_date DESC LIMIT 5;`;
        }


        var results = await db.runQuery(query);

        if (results[0].length > 0) {
            return {
                categoryList: results[0][0].map(ele => {
                    return {
                        id: ele.id,
                        title: ele.title,
                        display_date: ele.display_date,
                        description: ele.description,
                        url: ele.url,
                        image: "https://ourshopee.com/ourshopee-img/ourshopee_blog/thump/" + ele.image
                    }
                }),
                Recents: results[0][1].map(ele => {
                    return {
                        id: ele.id,
                        title: ele.title,
                        display_date: ele.display_date,
                        image: "https://ourshopee.com/ourshopee-img/ourshopee_blog/thump/" + ele.image,
                        description: ele.description,
                        url: ele.url,
                    }
                })
            }
        }

    } catch (err) {
        var err_report = "{" + err.stack + "}"
        // sendemailerr(err_report);
        return 'error';
    }
}

const deal_of_the_day = async (req) => {
    try {
        const bannerImages = await sectionImages(28);
        const hotDeals = await getSpecialDealsProducts(29, 24, 0)
        const trendingProducts = await getSpecialDealsProducts(29, 20, (req.query.page == '1' ? (0 + 24) : ((req.query.page - 1) * 20 + 24)))
        const return_output = {
            "banner_image": bannerImages,
            "hot_deals": hotDeals.slice(0, 4).map((item) => {
                const values = category_model.price_calculator(item);
                return {
                    id: item.id,
                    name: item.name,
                    display_price: `AED ${values.display_price}`,
                    countdown: moment(item.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    old_price: `AED ${item.price}`,
                    image: item.image,
                    percentage: `${values.percentage}`,
                    url: item.url,
                    sku: item.sku
                }
            }),
            "items": hotDeals.slice(4, 24).map((item) => {
                const values = category_model.price_calculator(item);
                return {
                    id: item.id,
                    name: item.name,
                    display_price: `AED ${values.display_price}`,
                    countdown: moment(item.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    old_price: `AED ${item.price}`,
                    image: item.image,
                    percentage: `${values.percentage}`,
                    url: item.url,
                    sku: item.sku
                }
            }),
            "trending_products": trendingProducts.map((item) => {
                const values = category_model.price_calculator(item);
                return {
                    id: item.id,
                    name: item.name,
                    display_price: `AED ${values.display_price}`,
                    countdown: moment(item.to_date).format('YYYY-MM-DD HH:mm:ss'),
                    old_price: `AED ${item.price}`,
                    image: item.image,
                    percentage: `${values.percentage}`,
                    url: item.url,
                    sku: item.sku
                }
            }),
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


        var topItemsList = [];
        // if( req.query.page === '1' ) {
        var input_data = { section_id: 74, offset: 0, limit: 4 }
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
        // }

        var limit = 20;
        var offset = typeof req.query.page !== 'undefined' ? (parseInt(req.query.page) - 1) * limit : 0

        if (req.query.page === '1') {
            offset = offset + 4;
        }
        var input_data = { section_id: 74, offset: offset, limit: limit, condition_from_date: false, condition_quantity: true }
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


        const return_output = {
            "banner_image": [
                {
                    id: 1,
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_categorybanner/1895826381_Mobiles&Tablets.jpg",
                    url: ""
                }
            ],
            "items": topItemsList,
            "top_Selling_products": itemsList,
        }
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}

const saver_zone1 = async (req) => {
    try {
        const sec_id = req.query.section_id
        var query = `
                    SELECT a.*,b.name as subcatname,b.url as subcaturl,c.name as subsubname, c.url as subsuburl, d.name as brandname, d.url as brandurl,sp.id,sp.title_en as heading ,sp.title_ar,sp.title_display,sp.position,sp.status,sp.html_type,sp.main_css,sp.list_css 
                    from ourshopee_section_page sp
                    left join ourshopee_section_page_details a on a.page_id = sp.id
                    left join ourshopee_subcategory b on a.subcategory_id = b.id  
                    left join ourshopee_subsubcategory c on a.sub_sub_cat_id = c.id 
                    left join ourshopee_brands d on a.brand_id = d.id 
                    where sp.section_id=${sec_id} and sp.status = 1 order by sp.position asc; 

                    select product_id from ourshopee_section_products where section_id = ${sec_id} order by position limit 8;
                    
                    `;

        var results = await db.runQuery(query);
        const banner_images = await sectionImages(sec_id);
        const section_page = results[0][0];

        const normalized_section_page = section_page.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)

        const op = await Promise.all(normalized_section_page.map(async (ele) => {
            var html_type = ele.html_type;

            if (ele.title_display == 1) {
                var main_title = ele.heading;
            } else {
                var main_title = "";
            }

            if (html_type == 8) {
                const ui = await getSpecialDealsProducts(sec_id, 4, 0)
                return {
                    "heading": main_title,

                    "type": html_type,
                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "items": ui.map((item) => {
                        const values = category_model.price_calculator(item);
                        return {
                            id: item.id,
                            name: item.name,
                            display_price: `AED ${values.display_price}`,
                            countdown: moment(item.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                            old_price: `AED ${item.price}`,
                            image: item.image,
                            percentage: `${values.percentage}`,
                            url: item.url,
                            sku: item.sku
                        }
                    })

                }
            }

            if (html_type == 9) {
                const ui = await getComboDealsProducts(sec_id, 10, 0)
                return {
                    "heading": main_title,

                    "type": html_type,
                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,

                    "items": ui.map((item) => {
                        const values = category_model.price_calculator(item);
                        return {
                            id: item.id,
                            name: item.name,
                            display_price: `AED ${values.display_price}`,
                            countdown: moment(item.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                            old_price: `AED ${item.price}`,
                            image: item.image,
                            percentage: `${values.percentage}`,
                            url: item.url,
                            sku: item.sku
                        }
                    })

                }
            }



            if (html_type == 3) {
                // let domainr = (new URL(ele.en_redirection));
                return {
                    "heading": main_title,
                    "type": "single_image",

                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "images": {
                        id: ele.id,
                        desktopImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + ele.en_image,
                        mobileImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + ele.en_mobile_image,
                    }

                }
            }

            if (html_type == 4) {
                return {
                    "heading": main_title,
                    "type": "multiple_images",

                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "images": section_page.filter(ele_img => ele_img.id == ele.id).map((final_items => {
                        const values = section_dynamic_cond((final_items));
                        let domain = (new URL(values.redirection));
                        if (domain.pathname.includes(".php")) {
                            const queryString = domain.search.split("?")[1].split("=")[1].split("&")[0];
                            var pathname = "/products-category/" + queryString
                        } else {
                            var pathname = domain.pathname
                        }
                        return {
                            url: pathname,
                            list_css: final_items.list_css,
                            id: final_items.id,
                            desktopImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + final_items.en_image,
                            mobileImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + final_items.en_mobile_image
                        }
                    }))

                }
            }

            if (html_type == 2) {
                return {
                    "heading": main_title,
                    "type": "brands",

                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "items": section_page.filter(ele_img => ele_img.id == ele.id).map((final_items => {
                        const values = section_dynamic_cond((final_items));
                        return {
                            url: values.redirection,
                            id: final_items.brand_id,
                            desktopImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + final_items.en_image,
                            mobileImage: "https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/" + final_items.en_mobile_image
                        }
                    }))

                }
            }

            if (html_type == 11) {
                var row_sec_id = ele.tag_id.split("=")
                const ui = await getSpecialDealsProducts(row_sec_id[1], 12, 0)
                return {
                    "heading": main_title,
                    "type": "items",

                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "items": ui.map((item) => {
                        const values = category_model.price_calculator(item);
                        return {
                            id: item.id,
                            name: item.name,
                            display_price: `AED ${values.display_price}`,
                            countdown: moment(item.offer_to).format('YYYY-MM-DD HH:mm:ss'),
                            old_price: `AED ${item.price}`,
                            image: item.image,
                            percentage: `${values.percentage}`,
                            url: item.url,
                            sku: item.sku
                        }
                    })

                }
            }

            if (html_type == 1) {
                const subcategory_filtered_data = section_page.filter(ele => ele.html_type == 1);
                return {
                    "heading": main_title,

                    "type": html_type,
                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "items": subcategory_filtered_data.map((sub, index) => {
                        const values = section_dynamic_cond(sub);
                        let domain = (new URL(values.redirection));
                        return {
                            id: index + 1,
                            url: domain.pathname,
                            sub_category_image: `https://www.ourshopee.com/ourshopee-img/ourshopee_section_page/${sub.en_image}`,
                            sub_category_name: sub.title_en
                        }
                    })

                }

            }

            if (html_type == 5) {
                var aggs_obj = {};
                const values = section_dynamic_cond((ele));
                const dynamic_elk_cond = values.elk_cond_Array;

                if (Object.keys("dynamic_elk_cond").length > 0) {
                    var dynamic_query = [
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
                                "front_view": 1
                            }
                        },
                        { "range": { "quantity": { "gte": 1 } } }
                    ];;
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
                    if (dynamic_elk_cond.hasOwnProperty("brand_id")) {
                        var dynamic_query_obj = {
                            "match": {
                                "brand_id": dynamic_elk_cond.brand_id
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

                const client = await config.elasticsearch();
                const result = await client.search({
                    index: process.env.es_index,
                    body: {
                        "size": 0,
                        "aggs": aggs_obj
                    }
                });


                var domain = (new URL(values.redirection));

                var array = Object.keys(result.aggregations).map((iop => result.aggregations[iop].docs.hits)).map(ele => {
                    return {
                        "subcategory_name": main_title,
                        items: ele.hits.map(h => h._source).map(prod => {
                            const values = category_model.price_calculator(prod);

                            return {
                                id: prod.id,
                                name: prod.name,
                                display_price: `AED ${values.display_price}`,
                                old_price: `AED ${prod.price}`,
                                image: prod.image,
                                percentage: `${values.percentage}`,
                                url: prod.url,
                                sku: prod.sku
                            }
                        }),
                        "url": domain.pathname
                    }
                })

                return {
                    "heading": main_title,
                    "type": "category_items",

                    "list_css":ele.list_css ,
                    "main_css":ele.main_css ,
                    "items": array,
                }
            }
        }))

        var final_output = {
            ["slider_images"]: banner_images,
            other_section: op.filter(ele => ele != null)
        }

        return final_output
    } catch (err) {
        console.log(err);
        return 'error';
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
    get_products_by_section_elk: get_products_by_section_elk,
    get_products_by_ids_elk: get_products_by_ids_elk,
    getInfinteScrollItems: getInfinteScrollItems
}