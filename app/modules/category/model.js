const config = require('../../config');
const db = require('../../db');
const moment = require('moment');
const momenttimezone = require('moment-timezone');

const brandsModel = require('../brands/model')

const sendemailerr = require('../../helpers/email').emailerr;

//------------------------------------------------------------
const categories_elk = async (req) => {

    const client = await config.elasticsearch();
    const result = await client.search({
        index: 'categories',
        body: {
            "size": "1000"
        }
    });
    return result.hits.hits.map(h => h._source);
}

//----------------------------------------------------------------------ok
const call_common_query = async (name, section_id, limit) => {
    //const con = await config.connection();

    var now = new Date();

    if (name == 'exciting_offers') {
        var dateStringWithTime = moment(now).add(1, 'days').format('YYYY-MM-DD HH:mm:ss');
        var query = `SELECT a.*,b.name as subcategory from ourshopee_products a LEFT JOIN ourshopee_subcategory b ON b.id = a.subcategory_id where a.status = 1 and a.shipping_charge > 0 and a.quantity > 0 and a.stock != 'Out of stock' 
            AND a.offer_from <= '${dateStringWithTime}' AND a.offer_to >= '${dateStringWithTime}' and a.most_selling = 1 order by a.updated_date DESC limit ${limit}`;
    } else if (name == 'perfume_fiesta') {
        var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
        var query = `SELECT a.product_id,b.name,b.sku,b.id,b.image,b.price,b.special_price,b.promotion_price,b.url,b.stock,b.quantity,b.brands_category_id,b.storage_id,b.color_id,b.shipping_charge,
        b.to_date,b.updated_date,b.transparent_image FROM ourshopee_section_products a LEFT OUTER JOIN ourshopee_products b ON a.product_id = b.id
                	  		   WHERE a.section_id = ${section_id} and b.offer_from < '${dateStringWithTime}' order by b.from_date desc,b.updated_date desc limit ${limit}`;
    } else {
        var dateStringWithTime = moment(now).format('YYYY-MM-DD HH:mm:ss');
        var query = `SELECT a.product_id,b.name,b.sku,b.id,b.image,b.price,b.special_price,b.promotion_price,b.url,b.stock,b.quantity,b.brands_category_id,b.storage_id,b.color_id,b.shipping_charge,
        b.to_date,b.updated_date,b.transparent_image FROM ourshopee_section_products a LEFT OUTER JOIN ourshopee_products b ON a.product_id = b.id
        WHERE a.section_id = ${section_id} and b.from_date < '${dateStringWithTime}' order by b.from_date desc,b.updated_date desc limit ${limit}`;

    }


    try {
        var result = await db.runQuery(query);
        result = result[0];

        const output = result.map((Element) => {
            const path = (Element.transparent_image == '') ? "https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/" + Element.image : 'https://www.ourshopee.com/ourshopee-img/ourshopee_transparant_image/' + Element.transparent_image;

            const values = price_calculator(Element);

            return {
                id: Element.id,
                image: path,
                countdown: moment((name == "exciting_offers") ? Element.offer_to : Element.to_date).format('YYYY-MM-DD HH:mm:ss'),
                name: Element.name,
                ...(name == "exciting_offers") && { sub_category: Element.subcategory },
                old_price: 'AED ' + Element.price,
                display_price: `AED ${values.display_price}`,
                percentage: values.percentage,
                url: Element.url.substr(0, 60) + "/" + Element.sku + "/"
            }
        })
        //con.release(); // releasing the connection
        return output
    } catch (err) {
        return 'error';
    }
}


// ---------------------------------------------------------

const subcategoryMetatags = async (req) => {
    try {
        let url=req.body.url;
        var query = `SELECT seo_title,seo_description,seo_keywords from ourshopee_subcategory where url='${url}'`;
        var result = await db.runQuery(query);
        result = result[0];
        return result;
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------------------------------------
const subsubcategoryMetatags = async (req) => {
    try {
        let url=req.body.url;
        var query = `SELECT seo_title,seo_description,seo_keywords from ourshopee_subsubcategory where url='${url}'`;
        var result = await db.runQuery(query);
        result = result[0];
        return result;
    } catch (err) {
        return 'error';
    }
}


// ----------------------------------------------------------

const brandsMetatags = async (req) => {
    try {
        let url=req.body.url;
        var query = `SELECT seo_title,seo_description,seo_keywords from ourshopee_brands where url='${url}'`;
        var result = await db.runQuery(query);
        result = result[0];
        return result;
    } catch (err) {
        return 'error';
    }
}

// -------------------------------------------------------------------------------

const categorymetatags=async(req)=>{
    try {
        let name=req.query.cat_url;
        var query = `SELECT seo_title,seo_description,seo_keywords FROM ourshopee_category WHERE url='${name}';`;
        var result = await db.runQuery(query);
        result = result[0];
        return result;
    } catch (err) {
        return 'error';
    }

}



// -------------------------------------------------------------
const getcategorylist = async (req, res) => {
    try {

        const elk_condition = config.elastic;

        if (elk_condition == 'truae') {
            const filter_results = await categories_elk();
            return filter_results;
        } else {
            var query = `SELECT c.id as category_id, c.url as url, c.name as category_name, concat("https://www.ourshopee.com/ourshopee-img/ourshopee_category/vector-icons/", c.vector_icon) as vector_icon, c.position as category_position, 
            sc.id as subcategory_id, sc.url as sub_url, ssc.url as sub_sub_url, sc.name as sub_category_name, concat("https://ourshopee.com/ourshopee-img/ourshopee_subcategory/", sc.image) as sub_category_image,
            
            sc.position as sub_category_position, 
            ssc.id as subsubcategory_id, ssc.name as sub_sub_category_name, 
            concat("https://ourshopee.com/ourshopee-img/ourshopee_subsubcategory/", ssc.image) as sub_sub_category_image,
            ssc.position as sub_sub_category_position 
            FROM ourshopee_category c 
            LEFT JOIN ourshopee_subcategory sc ON sc.category_id = c.id 
            LEFT JOIN ourshopee_subsubcategorylist sscl ON sscl.subcategory_id = sc.id AND sscl.category_id = c.id 
            LEFT JOIN ourshopee_subsubcategory ssc ON ssc.id = sscl.subsubcategory_id and ssc.id IS NOT NULL
            WHERE c.status = 1 ORDER BY c.position asc , sc.position asc , sub_sub_category_position desc;
            
            SELECT distinct brand_id, count, subcategory_id, b.name, b.url 
            FROM ourshopee_brandcount bc 
            LEFT JOIN ourshopee_brands b on b.id = bc.brand_id
            WHERE bc.brand_id != 38 and bc.brand_id != 0 and b.front_view = 1 and count > 0 ORDER BY count desc ;`;
            var results = await db.runQuery(query);

            const result = results[0][0];

            const result1 = results[0][1];

            const category = result.filter((v, i, a) => a.findIndex(v2 => ['category_id', 'category_name'].every(k => v2[k] === v[k])) === i).map((Element5) => {
                return {
                    category_id: Element5.category_id,
                    category_name: Element5.category_name,
                    url: Element5.url,
                    vector_icon: Element5.vector_icon
                }
            })

            const output = category.map((Element) => {
                return {
                    ...Element,
                    subcategory: result.filter((v, i, s) => s.findIndex(v2 => ['subcategory_id'].every(k => v2[k] === v[k])) === i).filter((Element2) => {
                        return Element.category_id == Element2.category_id
                    }).map((Element3) => {
                        return {
                            category_id: Element3.category_id,
                            sub_category_id: Element3.subcategory_id,
                            sub_category_name: Element3.sub_category_name,
                            sub_category_image: Element3.sub_category_image,
                            url: Element3.sub_url,
                            sub_subcategory: result.filter((Element4) => {
                                return Element3.subcategory_id == Element4.subcategory_id
                            }).filter(Element7 => Element7.subsubcategory_id != null).map((Element5) => {
                                return {
                                    sub_category_id: Element5.subcategory_id,
                                    sub_subcategory_id: Element5.subsubcategory_id,
                                    sub_subcategory_name: Element5.sub_sub_category_name,
                                    sub_subcategory_image: Element5.sub_sub_category_image,
                                    url: Element3.sub_url + "/" + Element5.sub_sub_url
                                }
                            }),
                            brands: result1.filter((Element6) => {
                                return Element6.subcategory_id == Element3.subcategory_id
                            })
                        }
                    }),
                }
            })

            return output
        }

    } catch (err) {
        return 'error';
    }
}

//----------------------------------------------------------------------ok
const price_calculator = (data) => {
    try {
        const current_zone_date = momenttimezone().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss');

        var current_date = moment(current_zone_date).unix();

        var promotion_from = moment(data.from_date).unix();

        var promotion_to = moment(data.to_date).unix();

        if (current_date > promotion_from && current_date < promotion_to) {
            var display_price = data.promotion_price;
        } else {
            if (current_date > promotion_from || data.from_date == 'Invalid Date' || data.from_date == null) {
                var display_price = data.special_price;
            } else {
                var display_price = data.promotion_price;
            }
        }

        var price = data.price;

        var diff = price - display_price;

        var percentage = diff / price * 100;

        return {
            display_price: display_price,
            percentage: Math.round(percentage)
        }
    } catch (err) {
    }
}

// ----------------------------------------------------------
const product_category_elk = async (req, res) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 0,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "category_url.keyword": req.query.cat_url
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
                        { "range": { "quantity": { "gte": 1 } } }
                    ]
                }
            },
            "aggs": {
                "categories": {
                    "terms": {
                        "field": "subcategory_id",
                        "size": 50
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "size": 20,
                                "sort": {
                                    "position": "asc",
                                    "updated_date": "desc",
                                },
                            }
                        }
                    }
                },
                "top_brands": {
                    "terms": {
                        "field": "brand_id",
                        "size": 100000
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["brand_id", "brand_name", "brand_image", "brand_url"],
                                "size": 1
                            }
                        }
                    }
                },
                "hot_deals": {
                    "filter": {
                        "bool": {
                            "must": {
                                "term": {
                                    "stock": "In stock"
                                }
                            },
                            "filter": {
                                "range": {
                                    "offer_from": {
                                        "lte": "now"
                                    }
                                }
                            }
                        }
                    },

                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "sort": { "offer_from": "desc" },
                                "size": 4
                            }
                        }
                    }
                }
            }
        }
    });

    return {
        product_categories: result.aggregations.categories.buckets,
        top_brands: result.aggregations.top_brands.buckets,
        hot_deals: result.aggregations.hot_deals.docs.hits
    }
}

//----------------------------------------------------------
const getallcategoryItems = async (req) => {


    const category_output = await product_category_elk(req);
    const meta_tags=await categorymetatags(req);

    const top_brands = category_output.top_brands.map(ele => {

        var brand_image = ele.docs.hits.hits[0]._source.brand_image;
        if (brand_image != undefined) {
            var splitted_image_url = brand_image.split("ourshopee_brands")[1];
            if (splitted_image_url != '/' && splitted_image_url.split(".")[1] != undefined) {
                return {
                    id: ele.docs.hits.hits[0]._source.brand_id,
                    brand_name: ele.docs.hits.hits[0]._source.brand_name,
                    url: ele.docs.hits.hits[0]._source.brand_url,
                    image: ele.docs.hits.hits[0]._source.brand_image,
                }
            }
        }
    })


    const categories = category_output.product_categories.map(ele => {
        const subcategory_name = ele.docs.hits.hits[0]._source.subcategory_name;
        if(subcategory_name != undefined){
            return {
                subcategory_id: ele.docs.hits.hits[0]._source.subcategory_id,
                subcategory_name: ele.docs.hits.hits[0]._source.subcategory_name,
                url: ele.docs.hits.hits[0]._source.subcategory_url,
                items: ele.docs.hits.hits.map(ele2 => {
    
                    var display_price = ele2._source.price - ele2._source.special_price;
    
                    var percentage = display_price / ele2._source.price * 100;
    
                    return {
                        id: ele2._source.id,
                        name: ele2._source.name,
                        display_price: "AED " + ele2._source.special_price,
                        old_price: "AED " + ele2._source.price,
                        image: ele2._source.image,
                        percentage: Math.round(percentage),
                        url: ele2._source.url,
                        sku: ele2._source.sku,
                    }
                })
            }
        }
    })

    var sql_output = await brandsModel.getCategoryBanner(category_output.product_categories[0].docs.hits.hits[0]._source.category_id);

    try {

        const return_output = {
            "category_image": sql_output,
            "hot_deals": category_output.hot_deals.hits.map(ele => {
                const values = price_calculator(ele._source);
                return {
                    id: ele._source.id,
                    image: ele._source.image,
                    countdown: ele._source.offer_to,
                    display_price: `AED ${values.display_price}`,
                    name: ele._source.name,
                    url: ele._source.url,
                    sku: ele._source.sku,
                }
            }),
            "top_brands": top_brands.filter(ele => ele != null).slice(0, 16),
            "categories": categories.reduce(function (si, current) {
                return si.concat(current);
            }, []).filter(ele => ele != null),
            "meta_tags":meta_tags,
        }
        return return_output
    } catch (err) {
        return 'error';
    }
}

//-----------------------------------------------------------
const getallItems = async (req) => {
    try {
        if (req.query.cat_url != "undefined") {
            var dynamic_query = [
                { "match": { "category_url": req.query.cat_url } },
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
                    "range": {
                        "quantity": {
                            "gte": "0"
                        }

                    }
                }

            ]
        } else {
            var dynamic_query = [
                { "match": { "subcategory_url": 'Perfumes' } },
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
                    "range": {
                        "quantity": {
                            "gte": "0"
                        }

                    }
                }
            ]
        }
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
                                "must": dynamic_query
                            }
                        },
                        "random_score": {}
                    }
                }
            }
        });

        const products = result.hits.hits.map(h => h._source);
        return products.map(ele => {
            const values = price_calculator(ele);

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

module.exports = {
    getcategorylist: getcategorylist,
    getallcategoryItems: getallcategoryItems,
    getallItems: getallItems,
    price_calculator: price_calculator,
    call_common_query: call_common_query,
    categories_elk, categories_elk,
    subcategoryMetatags: subcategoryMetatags,
    subsubcategoryMetatags: subsubcategoryMetatags,
    brandsMetatags: brandsMetatags
}