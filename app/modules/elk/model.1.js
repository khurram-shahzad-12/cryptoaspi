const { async } = require('q');
const config = require('../../config');
const db = require('../../db');
const sendemailerr = require('../../helpers/email').emailerr;

const postproducts = async (req) => {
    
    try {

        var query = ` SELECT GROUP_CONCAT(distinct sp.section_id) AS ValueArray,p.id,p.sku,p.url,p.name,p.product_model,
        p.transparent_image,
        b.id as brand_id,b.name as brand_name, concat("https://www.ourshopee.com/ourshopee-img/ourshopee_brands/",b.image) as brand_image,b.url as brand_url,
        c.id as color_id,c.name as color_name,s.id as size_id,s.name as size_name,
        concat("https://www.ourshopee.com/ourshopee-img/ourshopee_products/thump/",p.image) as image,
        p.price,p.special_price,p.promotion_price,p.stock,
        p.quantity,p.shipping_charge,
        p.from_date,p.to_date,p.offer_from,p.offer_to,
        p.category_id,cat.name as category_name,cat.url as category_url,
        p.subcategory_id,sub_cat.name as subcategory_name,sub_cat.url as subcategory_url,
        p.sub_subcategory_id as sub_sub_category_id , ssc.name as sub_sub_category_name,ssc.url as sub_sub_category_url,p.details,p.front_view,p.most_selling,
        p.warranty,p.warranty_type,(STR_TO_DATE(p.updated_date, '%Y-%m-%d %T')) as updated_date ,p.position,
        ac.id as attribute_id,ac.name as attribute_name,av.value as attribute_value
        FROM ourshopee_products p
        left join ourshopee_section_products sp on sp.product_id = p.id 
        LEFT JOIN ourshopee_attribute_value av ON av.sku = p.sku 
        LEFT JOIN ourshopee_attributes ac ON ac.id = av.attribute_type 
        left join ourshopee_category cat on cat.id = p.category_id
        left join ourshopee_subcategory sub_cat on sub_cat.id = p.subcategory_id 
        LEFT JOIN ourshopee_subsubcategorylist sscl ON sscl.subcategory_id = sub_cat.id AND sscl.category_id = cat.id AND sscl.subsubcategory_id = p.sub_subcategory_id
        LEFT JOIN ourshopee_subsubcategory ssc ON ssc.id = sscl.subsubcategory_id and ssc.id IS NOT NULL
        left join ourshopee_colors c on c.id = p.color_id
        left join ourshopee_size s on s.id = p.size_id
        left join ourshopee_brands b on b.id = p.brand_id where p.status = 1 and p.quantity > 1 and cat.id = ${req.query.id} group by p.id,ac.name;

        SELECT  distinct brand_id , count ,
        concat("https://www.ourshopee.com/ourshopee-img/ourshopee_brands/",b.image) as brand_image,b.url as brand_url,
        category_id,subcategory_id,b.name as brand_name,b.url FROM ourshopee_brandcount bc 
            left join ourshopee_brands b on b.id = bc.brand_id
            where  bc.brand_id != 0 and b.front_view = 1 and count > 0 and category_id = ${req.query.id} order by count desc;

        SELECT p.id,p.sku,p.category_id,GROUP_CONCAT(DISTINCT 'https://www.ourshopee.com/ourshopee-img/ourshopee_product_images/',pi.image ORDER BY pi.id asc) AS ImageArray FROM ourshopee_products p
        left join ourshopee_product_images pi on pi.product_id = p.id
        where p.status = 1 and p.quantity > 1 and category_id = ${req.query.id} group by p.id ;
        `;


        var results = await db.runQuery(query);

        const dataset = results[0][0];
        const result1 = results[0][1];
        const product_images = results[0][2];

        const products = dataset.filter((v, i, a) => a.findIndex(v2 => ['id'].every(k => v2[k] === v[k])) === i)

        const output = products.map((ele) => {
            var json_obj = {};
            // json_obj['search_engine_values'] = ele.category_name + ele.subcategory_name + ele.name + ele.color_name;
            const dynamic_attributes = dataset.filter((Element2 => (Element2.id == ele.id && Element2.id))).map((ele4) => {
                json_obj[ele4.attribute_name] = ele4.attribute_value
                return {
                    key: ele4.attribute_name,
                    value: ele4.attribute_value
                }
            })
            json_obj['product_images'] = product_images.filter(ele_img => ele_img.id == ele.id).map(out => {
                return out.ImageArray
            })
            json_obj['section_id'] = ele.ValueArray != null && ele.ValueArray.split(',')
            json_obj['attributes'] = dynamic_attributes
            return { ...ele, ...json_obj };
        })


        const client = await config.elasticsearch();
        await client.indices.create({
            index: process.env.es_index
            // operations:{
            //     "mappings": {
            //       "properties": {
            //         "category_id": {
            //           "type": "integer"
            //         },
            //         "subcategory": {
            //           "type": "nested",
            //           "properties": {
            //             "sub_category_id": {
            //               "type": "integer"
            //             },
            //             "sub_category_name": {
            //               "type": "text"
            //             },
            //             "filters": {
            //                      "type": "nested",
            //                       "properties": {
            //                           "title": {
            //                             "type": "text"
            //                           },
            //                         "list": {
            //                           "type": "nested"
            //                         }
            //           }
            //             },
            //             "top_brands":{
            //               "type": "nested"
            //             },
            //             "products":{
            //               "type" : "nested"
            //             }
            //           }
            //         }
            //       }
            //     }
            //   }
        }, { ignore: [400] })

        const body = output.flatMap(doc => [{ index: { _index: process.env.es_index } }, doc])

        const bulkResponse = await client.bulk({ refresh: true, body })

        if (bulkResponse) {
            const erroredDocuments = []
            // The items array has the same order of the dataset we just indexed.
            // The presence of the `error` key indicates that the operation
            // that we did for the document has failed.
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0]
                if (action[operation].error) {
                    erroredDocuments.push({
                        // If the status is 429 it means that you can retry the document,
                        // otherwise it's very likely a mapping error, and you should
                        // fix the document before to try it again.
                        status: action[operation].status,
                        error: action[operation].error,
                        operation: body[i * 2],
                        document: body[i * 2 + 1]
                    })
                }
            })
        }

        const { body: count } = await client.count({ index: process.env.es_index })
        return bulkResponse
    } catch (err) {
        return 'error';
    }

}

const postsearch_redirect = async (req) => {

    try {

        var query = `SELECT redirect_id ,redirect_url,search_key,'search_redirect' as type FROM ourshopee_search_redirect WHERE status = 1`;
        var results = await db.runQuery(query);
        const result = results[0];
        const client = await config.elasticsearch();
        await client.indices.create({
            index: 'search_redirect'
        }, { ignore: [400] })

        const body = result.flatMap(doc => [{ index: { _index: 'search_redirect' } }, doc])

        const bulkResponse = await client.bulk({ refresh: true, body })

        if (bulkResponse) {
            const erroredDocuments = []
            // The items array has the same order of the dataset we just indexed.
            // The presence of the `error` key indicates that the operation
            // that we did for the document has failed.
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0]
                if (action[operation].error) {
                    erroredDocuments.push({
                        // If the status is 429 it means that you can retry the document,
                        // otherwise it's very likely a mapping error, and you should
                        // fix the document before to try it again.
                        status: action[operation].status,
                        error: action[operation].error,
                        operation: body[i * 2],
                        document: body[i * 2 + 1]
                    })
                }
            })
            console.log(erroredDocuments)
        }

        const { body: count } = await client.count({ index: 'search_redirect' })
        return bulkResponse

    } catch (err) {
       return 'error';
    }
}

module.exports = {
    postproducts: postproducts,
    postsearch_redirect: postsearch_redirect,
}