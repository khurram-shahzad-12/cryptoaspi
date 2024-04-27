const config = require('../../config');
const sendemailerr = require('../../helpers/email').emailerr;
const db = require('../../db');

const getCategoryBanner = async (category_id) => {
    try {
        const country_id = process.env.country_id;
        var query = `select * from ourshopee_category_sliders where category_id = ${category_id} and country_id = ${country_id} and status = 1 order by position ASC limit 5`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return await result[0].map((Element) => {
                return {
                    image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_category_sliders/" + Element.en_image,
                    mobile_image_url: "https://www.ourshopee.com/ourshopee-img/ourshopee_category_sliders/" + Element.en_mobile_image,
                    id: Element.id,
                    url: Element.en_url
                }
            })
        }
    } catch (err) {
        return 'error';
    }
}

const getBrandId = async (req) => {
    try {
        var query = `select * from ourshopee_brands where url='${req.query.slug.split("/")[0]}'`;
        var result = await db.runQuery(query);
        if (result[0].length > 0) {
            return result[0]
        }
    } catch (err) {
        return 'error';
    }
}

const getAllFilteredBrandItems = async (req, brand_name) => {

    if (req.query.hasOwnProperty("subcategory") || req.query.hasOwnProperty("subcategory_id")) {
        var dynamic_query = [
            { "match": { "brand_name": brand_name } },
            { "match": { "subcategory_id": req.query.subcategory_id } },
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
    } else {
        var dynamic_query = [
            { "match": { "brand_name": brand_name } },
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


    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index, //'normalized_products9',
        body: {
            "from": (req.query.page == '1' ? 0 : ((req.query.page - 1) * 50)),
            "size": 50,
            "sort": [
                {
                    "updated_date": {
                        "order": "desc"
                    },
                    "position": {
                        "order": "asc"
                    }
                },
            ],
            "query": {
                "bool": {
                    "must": dynamic_query
                }
            },
            "aggs": {
                "max_price": { "max": { "field": "special_price" } },
                "colors": {
                    "terms": {
                        "field": "color_id",
                        "size": 1000
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["color_id", "color_name"],
                                "size": 1
                            }
                        }
                    }
                },
                "categories": {
                    "terms": {
                        "field": "id",
                        "size": "100000"
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["subcategory_id", "sub_sub_category_id", "category_id", "category_name", "subcategory_name", "sub_sub_category_name"],
                                "size": 1
                            }
                        }
                    }
                }
            }
        }
    });

    const elk_output = {
        categories: result.aggregations.categories.buckets,
        max_price: result.aggregations.max_price.value,
        colors: result.aggregations.colors.buckets,
        products: result.hits.hits.map(h => h._source)
    }

    return elk_output;
}

const getBrandsBySubCategory = async (subcategory_id) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index, //'normalized_products9',
        body: {
            "_source": false,
            "query": {
                "bool": {
                    "must": [
                        { "match": { "subcategory_id": subcategory_id } }
                    ]
                }
            },
            "aggs": {
                "brands": {
                    "terms": {
                        "field": "brand_id"
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["brand_id", "brand_name", "brand_image", "brand_url"],
                                "size": 1
                            }
                        }
                    }
                }
            }
        }
    });

    const elk_output = {
        brands: result.aggregations.brands.buckets,
    }

    return elk_output;
}

const getAllBrandItems = async (req) => {

    if (req.query.brand_id == 0) {
        const brandResult = await getBrandId(req);
        var elk_result = await getAllFilteredBrandItems(req, brandResult[0].name);
    } else {
        var elk_result = await getAllFilteredBrandItems(req, req.query.brand_name);
    }


    if (req.query.hasOwnProperty("subcategory_id")) {
        var elk_brands = await getBrandsBySubCategory(req.query.subcategory_id);
        elk_brands = elk_brands.brands
        const category_id = req.query.category_id;
        var sql_output = await getCategoryBanner(category_id);
    } else {
        var elk_brands = []
        var sql_output = [{
            "image_url": "https://www.ourshopee.com/ourshopee-img/ourshopee_category_sliders/1_28042021121136_UAE.jpg",
            "mobile_image_url": "https://www.ourshopee.com/ourshopee-img/ourshopee_category_sliders/2_28042021121136_shopnowpaylater.jpg",
            "id": 1,
            "url": ""
        }]
    }

    try {

        const elk_normalized_data = elk_result.categories.filter((v, i, a) => a.findIndex(v2 => ['key'].every(k => v2[k] === v[k])) === i).map((Element5) => {
            return {
                category_id: Element5.docs.hits.hits[0]._source.category_id,
                value: Element5.docs.hits.hits[0]._source.category_id + "_" + Element5.docs.hits.hits[0]._source.category_id + "@category",
                label: Element5.docs.hits.hits[0]._source.category_name,
                subcategory_id: Element5.docs.hits.hits[0]._source.subcategory_id,
                subcategory_name: Element5.docs.hits.hits[0]._source.subcategory_name,
                sub_sub_category_id: Element5.docs.hits.hits[0]._source.sub_sub_category_id,
                sub_sub_category_name: Element5.docs.hits.hits[0]._source.sub_sub_category_name,
            }
        })

        const categories = elk_normalized_data.filter((v, i, a) => a.findIndex(v2 => ['category_id'].every(k => v2[k] === v[k])) === i).map((Element) => {
            return {
                ...Element,
                children: elk_normalized_data.filter((v, i, s) => s.findIndex(v2 => ['subcategory_id'].every(k => v2[k] === v[k])) === i).filter((Element2) => {
                    return Element.category_id == Element2.category_id
                }).map((Element3) => {
                    return {
                        category_id: Element3.category_id,
                        subcategory_id: Element3.subcategory_id,
                        value: Element3.subcategory_id + "_" + Element3.category_id + "@subcategory",
                        label: Element3.subcategory_name,
                        children: elk_normalized_data.filter((Element4) => {
                            return Element3.subcategory_id == Element4.subcategory_id
                        }).filter(Element7 => Element7.subsubcategory_id != null).map((Element5) => {
                            return {
                                sub_category_id: Element5.subcategory_id,
                                value: Element5.subcategory_id + "_" + Element5.subcategory_id + "@subsubcategory",
                                sub_subcategory_id: Element5.sub_sub_category_id,
                                label: Element5.sub_sub_category_name,
                            }
                        }).forEach(e =>
                            Object.entries(e).forEach(([key, value]) => value.length || delete e[key])
                        )
                    }
                }),
            }
        })

        const colors = elk_result.colors.map(ele => {
            return {
                id: ele.docs.hits.hits[0]._source.color_id,
                name: ele.docs.hits.hits[0]._source.color_name
            }
        }).filter(col => col.id != 0)
        const brands = elk_brands.map(ele => {
            return {
                brand_id: ele.docs.hits.hits[0]._source.brand_id,
                brand_name: ele.docs.hits.hits[0]._source.brand_name,
                image: ele.docs.hits.hits[0]._source.brand_image,
            }
        })

        const return_output = {
            "filters": {
                "slider_range": [{
                    "title": "price",
                    "min_value": 0,
                    "max_value": elk_result.max_price
                }],

                "checkbox": [
                    {
                        id: Math.floor(Math.random() * 10000),
                        title: "Colors",
                        list: colors
                    }
                ],
                "categories": categories
            },
            "display_items": {
                "banners": sql_output,
                "top_brands": brands,
                "products": elk_result.products.map((ele) => {

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
                })
            }
        }
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        return 'error';
    }
}


module.exports = {
    getAllBrandItems: getAllBrandItems,
    getCategoryBanner: getCategoryBanner
}