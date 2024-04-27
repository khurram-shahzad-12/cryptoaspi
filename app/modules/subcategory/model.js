const config = require('../../config');
const sendemailerr = require('../../helpers/email').emailerr;

const brandsModel = require('../brands/model')

const categoryModel = require('../category/model')

const filter_products_elk = async (req) => {

    if (req.query.sub_subcat_url) {
        var dynamic_query = [
            {
                "match": {
                    "subcategory_url.keyword": req.query.subcat_url
                }
            },
            {
                "match": {
                    "sub_sub_category_url.keyword": req.query.sub_subcat_url
                }
            },
            {
                "match": {
                    "stock": "In stock"
                }
            },
            { "range": { "quantity": { "gte": 1 } } }
        ]
    } else {
        var dynamic_query = [
            {
                "match": {
                    "subcategory_url.keyword": req.query.subcat_url
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

    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index, //'normalized_products9',
        body: {
            "from": (req.query.page == '1' ? 0 : ((req.query.page - 1) * 20)),
            "size": 50,
            "sort": [
                {
                    "position": {
                        "order": "asc"
                    },
                    "updated_date": {
                        "order": "desc"
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
                "attributes": {
                    "nested": {
                        "path": "attributes"
                    },
                    "aggs": {
                        "key": {
                            "terms": {
                                "field": "attributes.key"
                            },
                            "aggs": {
                                "value": {
                                    "terms": {
                                        "field": "attributes.value"
                                    }
                                }
                            }
                        }
                    }
                },
                "categories": {
                    "terms": {
                        "field": "id"
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["subcategory_id", "sub_sub_category_id", "category_id", "category_name", "subcategory_name", "sub_sub_category_name"],
                                "size": 1
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
                "brands": {
                    "terms": {
                        "field": "brand_id",
                        "size": 1000
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "_source": ["brand_id", "brand_name"],
                                "size": 1
                            }
                        }
                    }
                }
            }
        }
    });

    const elk_output = {
        filters: result.aggregations.attributes.key.buckets,
        max_price: result.aggregations.max_price.value,
        top_brands: result.aggregations.top_brands.buckets,
        colors: result.aggregations.colors.buckets,
        brands: result.aggregations.brands.buckets,
        products: result.hits.hits.map(h => h._source)
    }

    return elk_output;
}

const filtered_items_elk = async (req) => {

    const filter_items_list = req.body.filtered_items

    if (req.body.hasOwnProperty("price_range")) {
        var range_Query = [
            { "range": { "special_price": { "gte": parseInt(req.body.price_range[0].min) } } },
            { "range": { "special_price": { "lte": parseInt(req.body.price_range[0].max) } } }]
    } else {
        var range_Query = []
    }

    if (req.body.sub_subcat_url) {
        var json_dyn_url = [{
            "match": { [`sub_sub_category_url.keyword`]: `${req.body.sub_subcat_url}` }
        }]

    } else {
        var json_dyn_url = [{
            "match": { [`subcategory_url.keyword`]: `${req.body.subcat_url}` }
        }]
    }

    const mustQuery = [
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


    const dynamic_query = filter_items_list.filter(ele => ele.title.toLowerCase() == 'brands' || ele.title.toLowerCase() == 'colors' || ele.title == 'category' || ele.title == 'subcategory' || ele.title == 'subsubcategory').map((ele) => {
        if (ele.title.toLowerCase() == 'brands') {
            ele.title = 'brand_name'
        }
        if (ele.title.toLowerCase() == 'colors') {
            ele.title = 'color_name'
        }
        if (ele.title == 'category') {
            ele.title = 'category_id'
        }
        if (ele.title == 'subcategory') {
            ele.title = 'subcategory_id'
        }
        if (ele.title == 'subsubcategory') {
            ele.title = 'sub_sub_category_id'
        }
        return {
            ...(ele.title == 'category_id' || ele.title == 'subcategory_id' || ele.title == 'sub_sub_category_id') && { "terms": { [`${ele.title}`]: ele.value } },
            ...(ele.title == 'brand_name' || ele.title == 'color_name') && { "match": { [`${ele.title}`]: `${ele.value}` } },

        }
    })

    const dynamic_query_attributes = filter_items_list.filter(ele => ele.title != 'sortby' && ele.title != 'brand_name' && ele.title != 'color_name' && ele.title != 'subcategory_id' && ele.title != 'category_id' && ele.title != 'sub_sub_category_id').map((ele) => {
        return {
            "nested": {
                "path": "attributes",
                "query": {
                    "bool": {
                        "must": [
                            { "match": { "attributes.key": ele.title } },
                            { "terms": { "attributes.value": ele.value } }
                        ]
                    }
                }
            }
        }
    })

    const sort_by_exits = filter_items_list.filter(ele => ele.title == 'sortby');

    if (sort_by_exits.length > 0) {
        if (sort_by_exits[0].value == "Low to High") {

            var sortby_query = {
                "special_price": [{
                    "order": "asc"
                }]
            }

        } else if (sort_by_exits[0].value == "High to Low") {

            var sortby_query = [{
                "special_price": {
                    "order": "desc"
                }
            }]
        } else if (sort_by_exits[0].value == "new arrival") {

            var sortby_query = []
        }
    } else {
        var sortby_query = [
            {
                "position": {
                    "order": "asc"
                },
                "updated_date": {
                    "order": "desc"
                }
            }
        ]
    }

    if (req.body.hasOwnProperty("searchString")) {













        const search_query =
            [
                {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "stock": "In stock"
                                }
                            },
                            {
                                "bool": {
                                    "should": [{
                                        "multi_match": {
                                            "query": req.body.searchString,
                                            "type": "bool_prefix",
                                            "fields": [
                                                "subcategory_name^4",
                                                "name",
                                                "name._2gram",
                                                "name._3gram",
                                                "sku"
                                            ]
                                        }
                                    },
                                    {
                                        "fuzzy": {
                                            "name": {
                                                "value": req.body.searchString,
                                                "fuzziness": "AUTO"
                                            }
                                        }
                                    }]
                                }
                            }
                        ]
                    }
                }
            ]

        var dynamic_query_output =
        {
            "must": [
                ...search_query,
                ...req.body.subcategory_id != 'search' ? [{
                    "match": {
                        "subcategory_id": req.body.subcategory_id
                    }
                }] : [],
                ...dynamic_query, ...dynamic_query_attributes, ...range_Query, ...mustQuery
            ]
        }
    } else {
        var dynamic_query_output = {
            "must": [
                ...dynamic_query, ...dynamic_query_attributes, ...range_Query, ...mustQuery
            ]
        }
    }

    const client = await config.elasticsearch();

    if (req.body.hasOwnProperty("searchString")) {

        var result = await client.search({
            index: process.env.es_index,
            body: {
                "from": (req.body.page == '1' ? 0 : ((req.body.page - 1) * 50)),
                "size": 50,
                ...(sort_by_exits.length > 0 || !req.body.hasOwnProperty("searchString")) && { "sort": sortby_query },
                "query": {
                    "function_score": {
                        "query": {
                            "bool": dynamic_query_output
                        },
                        "functions": [
                            {
                                "filter": { "match": { "subcategory_id": "205" } },
                                "weight": 5
                            },
                            {
                                "filter": { "match": { "subcategory_id": "224" } },
                                "weight": 4.9
                            },
                            {
                                "filter": { "match": { "subcategory_id": "212" } },
                                "weight": 4.8
                            },
                            {
                                "filter": { "match": { "subcategory_id": "63" } },
                                "weight": 4.7
                            },
                            {
                                "filter": { "match": { "subcategory_id": "206" } },
                                "weight": 3
                            },
                            {
                                "filter": { "match": { "subcategory_id": "455" } },
                                "weight": 4.4
                            }
                        ]
                    }
                }
            }
        });








    }else{
        var result = await client.search({
            index: process.env.es_index,
            body: {
                "from": (req.body.page == '1' ? 0 : ((req.body.page - 1) * 50)),
                "size": 50,
                ...(sort_by_exits.length > 0 || !req.body.hasOwnProperty("searchString")) && { "sort": sortby_query },
                "query": {
                    "bool": dynamic_query_output
                }
            }
        });
    }





    return result.hits.hits.map(h => h._source);
}

function searchPages(array, string) {
    const find = ({ url, subcategory }) => url.includes(string) || subcategory && subcategory.some(find);
    return array.filter(find)[0].subcategory.map(Element3 => {
        return {
            category_id: Element3.category_id,
            sub_category_id: Element3.sub_category_id,
            value: Element3.sub_category_id + "@subcategory",
            label: Element3.sub_category_name,
            url: Element3.url,
            children: Element3.sub_subcategory.map((Element5) => {
                return {
                    sub_category_id: Element5.sub_category_id,
                    url: Element5.url,
                    value: Element5.sub_subcategory_id + "_" + Element5.sub_category_id + "@subsubcategory",
                    sub_subcategory_id: Element5.sub_subcategory_id,
                    label: Element5.sub_subcategory_name,
                }
            })
        }
    });
}

const getallsubcategoryItems = async (req) => {
    try {
        const elk_result = await filter_products_elk(req);
        const filter_results = await categoryModel.categories_elk();
        const filters_results = elk_result.filters

        var sql_output = await brandsModel.getCategoryBanner(elk_result.products[0].category_id);


        const filters = filters_results.map((ele, index) => {
            return {
                id: index + 1,
                title: ele.key,
                list: ele.value.buckets.map((ele1, index1) => {
                    return {
                        name: ele1.key,
                        id: index1 + 1
                    }
                })

            }
        })

        const top_brands = elk_result.top_brands.map(ele => {
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

        const colors = elk_result.colors.map(ele => {
            return {
                id: ele.docs.hits.hits[0]._source.color_id,
                name: ele.docs.hits.hits[0]._source.color_name
            }
        }).filter(col => col.id != 0)

        const brands = elk_result.brands.map(ele => {
            return {
                id: ele.docs.hits.hits[0]._source.brand_id,
                name: ele.docs.hits.hits[0]._source.brand_name
            }
        })

        const categories = searchPages(filter_results, req.query.subcat_url)


        const return_output = {
            "filters": {
                "categories": categories,
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
                    },
                    {
                        id: Math.floor(Math.random() * 10000),
                        title: "Brands",
                        list: brands
                    },
                    ...filters
                ]
            },
            "display_items": {
                "top_brands": top_brands.filter(ele => ele != null),
                "banners": sql_output,
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
        // sendemailerr(err_report);
        return 'error';
    }
}

const filtered_items = async (req) => {

    try {

        const elk_result = await filtered_items_elk(req);
        const filtered_products = elk_result

        const return_output = {
            "products": filtered_products.map((ele) => {

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
        return return_output
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        // sendemailerr(err_report);
        return 'error';
    }
}

module.exports = {
    getallsubcategoryItems: getallsubcategoryItems,
    filtered_items: filtered_items
}