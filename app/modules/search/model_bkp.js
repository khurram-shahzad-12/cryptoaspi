const config = require('../../config');
const sendemailerr = require('../../helpers/email').emailerr;

const searchproducts = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body: {
            "size": 20,
            "query": {
                "bool": {
                    "should": [
                        {
                            "multi_match": {
                                "query": req.query.str,
                                "type": "bool_prefix",
                                "fields": [
                                    "name",
                                    "name._2gram",
                                    "name._3gram",
                                    "sku"
                                ]
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
                            "range": {
                                "quantity": {
                                    "gte": 1
                                }
                            }
                        },
                        {
                            "fuzzy": {
                                "name": {
                                    "value": req.query.str,
                                    "fuzziness": "AUTO"
                                }
                            }
                        }
                    ]
                }
            }
        }
    });
    const searched_products = result.hits.hits.map(h => h._source).filter(ele => ele.stock == 'In stock');

    const products = searched_products.map((subparent) => {
        var display_price = subparent.price - subparent.special_price;

        var percentage = display_price / subparent.price * 100;

        return {
            category_id: subparent.category_id,
            category_name: subparent.category_name,
            subcategory_id: subparent.subcategory_id,
            subcategory_name: subparent.subcategory_name,
            sub_sub_category_id: subparent.sub_sub_category_id,
            sub_sub_category_name: subparent.sub_sub_category_name,
            id: subparent.id,
            name: subparent.name,
            display_price: "AED " + subparent.special_price,
            image: subparent.image,
            percentage: Math.round(percentage),
            old_price: "AED " + subparent.price,
            url: subparent.url,
            sku: subparent.sku,
            brand_id: subparent.brand_id,
            brand_name: subparent.brand_name,
            color_id: subparent.color_id,
            color_name: subparent.color_name
        }
    })

    return {
        products: products,
        matched_brands: products.filter((v, i, s) => s.findIndex(v2 => ['brand_name'].every(k => v2[k] === v[k])) === i && v.brand_name != null)
            .map((brand_list) => {
                return {
                    id: brand_list.brand_id,
                    name: brand_list.brand_name
                }
            })
    }

}

const searchredirect = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: 'search_redirect2',
        body: {
            "size": 1,
            "_source": true,
            "query": {
                "bool": {
                    "must": [
                        { "match_phrase": { "search_key": req.query.string } }
                    ]
                }
            }
        }
    });
    return result.hits.hits.map(h => h._source);
}

const search_result_elk = async (req) => {
    const client = await config.elasticsearch();
    const result = await client.search({
        index: process.env.es_index,
        body:  {
            "query": {
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
                                      "query": req.query.string,
                                      "type": "bool_prefix",
                                      "fields": [
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
                                          "value": req.query.string,
                                          "fuzziness": "AUTO"
                                      }
                                  }
                              }] 
                    }
                  }
                ]
              }
            },
            "aggs": {
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
                          },
                          "categories": {
                              "terms": {
                                  "field": "id",
                                  "size": 10000
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
        brands: result.aggregations.brands.buckets,
        colors: result.aggregations.colors.buckets,
        products: result.hits.hits.map(h => h._source).filter(ele => ele.stock == 'In stock')
    }

    return elk_output;
}

const search_result_items = async (req) => {
    try {
        const search_elk_redirect = await searchredirect(req);

        if (search_elk_redirect.length > 0) {
            return search_elk_redirect[0];
        } else {
            const elk_result = await search_result_elk(req);

            const elk_normalized_data = elk_result.categories.filter((v, i, a) => a.findIndex(v2 => ['key'].every(k => v2[k] === v[k])) === i).map((Element5) => {
                return {
                    category_id: Element5.docs.hits.hits[0]._source.category_id,
                    value: Element5.docs.hits.hits[0]._source.category_id + "@category",
                    label: Element5.docs.hits.hits[0]._source.category_name,
                    subcategory_id: Element5.docs.hits.hits[0]._source.subcategory_id,
                    subcategory_name: Element5.docs.hits.hits[0]._source.subcategory_name,
                    sub_sub_category_id: Element5.docs.hits.hits[0]._source.sub_sub_category_id,
                    sub_sub_category_name: Element5.docs.hits.hits[0]._source.sub_sub_category_name,
                }
            })

            const categories = elk_normalized_data.filter(ele => ele.category_id != 0).filter((v, i, a) => a.findIndex(v2 => ['category_id'].every(k => v2[k] === v[k])) === i).map((Element) => {
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
            const brands = elk_result.brands.map(ele => {
                return {
                    id: ele.docs.hits.hits[0]._source.brand_id,
                    name: ele.docs.hits.hits[0]._source.brand_name,
                }
            }).filter(col => col.id != 0)

            const return_output = {
                "filters": {
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
                        }
                    ],
                    "categories": categories,
                    "slider_range": [{
                        "title": "price",
                        "min_value": 0,
                        "max_value": 4000
                    }],
                },
                "display_items": {
                    "top_brands": [
                        {
                            "id": 11,
                            "brand_name": "Samsung",
                            "url": "Samsung",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/677654546samsung.png"
                        },
                        {
                            "id": 7,
                            "brand_name": "Apple",
                            "url": "Apple",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/26204259310893584apple.png"
                        },
                        {
                            "id": 215,
                            "brand_name": "Xiaomi",
                            "url": "Xiaomi",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/674164445xiaomi.png"
                        },
                        {
                            "id": 25,
                            "brand_name": "Oppo",
                            "url": "Oppo",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/341608086oppo.png"
                        },
                        {
                            "id": 1219,
                            "brand_name": "Honor",
                            "url": "Honor",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/228429790honor.png"
                        },
                        {
                            "id": 14,
                            "brand_name": "Nokia",
                            "url": "Nokia",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/378696696nokia.png"
                        },
                        {
                            "id": 37,
                            "brand_name": "Huawei",
                            "url": "Huawei",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/946406479huawei.png"
                        },
                        {
                            "id": 43,
                            "brand_name": "Motorola",
                            "url": "Motorola",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/"
                        },
                        {
                            "id": 1037,
                            "brand_name": "OnePlus",
                            "url": "OnePlus",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/711109024Logo-Oneplus.png"
                        },
                        {
                            "id": 23,
                            "brand_name": "Lava",
                            "url": "Lava",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/"
                        },
                        {
                            "id": 1608,
                            "brand_name": "Vivo",
                            "url": "Vivo",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/197225333Vivo 01.png"
                        },
                        {
                            "id": 2129,
                            "brand_name": "Realme",
                            "url": "Realme",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/339554950realme 01.png"
                        },
                        {
                            "id": 1,
                            "brand_name": "Lenovo",
                            "url": "Lenovo",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/108871391lenovo.png"
                        },
                        {
                            "id": 1141,
                            "brand_name": "BASEUS",
                            "url": "BASEUS",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/437936864"
                        },
                        {
                            "id": 2007,
                            "brand_name": "Redmi",
                            "url": "Redmi",
                            "image": "https://www.ourshopee.com/ourshopee-img/ourshopee_brands/"
                        }
                    ],
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
        }
    } catch (err) {
        var err_report = "{" + err.stack + "}"
        sendemailerr(err_report);
        return 'error';
    }
}

module.exports = {
    searchproducts: searchproducts,
    search_result_items: search_result_items
}