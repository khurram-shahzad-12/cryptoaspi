
const config_data = [
    {
        "type": "deal_of_the_day",
        "section_id": 29,
        "limit": 3,
    },
    {
        "type": "exciting_offers",
        "section_id": '',
        "limit": 24,
    },
    {
        "type": "bundle_deals",
        "section_id": 19,
        "limit": 3,
    },
    {
        "type": "clearance_sale",
        "section_id": 117,
        "limit": 4,
    },
    {
        "type": "category_items",
        "limit": 10,
    },
    {
        "type": "getcart_items",
        "section_id": 51,
    },
    {
        "type": "home_category_section",
        "categories": [
            {
                "category_id": 38,
                "subcategory": [212, 213, 214, 215, 216, 217]
            },
            {
                "category_id": 36,
                "subcategory": [176, 177, 178, 179, 180, 181]
            },
            {
                "category_id": 39,
                "subcategory": [219, 220, 221, 222, 223, 437]
            },
            {
                "category_id": 10,
                "subcategory": [33, 34, 281, 284, 285, 286]
            },
            {
                "category_id": 46,
                "subcategory": [400, 401, 402, 403, 404, 405]
            },
            {
                "category_id": 49,
                "subcategory": [63, 130, 329, 331, 332, 334]
            },
            {
                "category_id": 27,
                "subcategory": [112, 114, 431, 442, 443, 444]
            },
            {
                "category_id": 41,
                "subcategory": [233, 234, 236, 237, 238, 239]
            },
            {
                "category_id": 32,
                "subcategory": [138, 139, 140, 141, 142, 143]
            },

        ],
    },
    {
        "type": "pre-owned-banners",
        "items": {
            desktopImage: "https://www.ourshopee.com/images/pre-owned/Pre-owned-banner.jpg",
            mobileImage: "https://www.ourshopee.com/images/pre-owned/Pre-owned-banner-mob.jpg",
            carouselItems: [
                {
                    id: 1,
                    url: "/products-category/Pre-Owned-Mobiles/",
                    banner_image: "https://www.ourshopee.com/images/pre-owned/Pre-Owned-Mobiles.jpg"
                },
                {
                    id: 2,
                    url: "/products-category/Pre-Owned-Laptops/",
                    banner_image: "https://www.ourshopee.com/images/pre-owned/Pre-Owned-Laptops.jpg"
                },
                {
                    id: 3,
                    url: "/products-category/Pre-Owned-Printers/",
                    banner_image: "https://www.ourshopee.com/images/pre-owned/Pre-Owned-Printers.jpg"
                },
                {
                    id: 4,
                    url: "/products-category/Pre-Owned-Tablets/",
                    banner_image: "https://www.ourshopee.com/images/pre-owned/Pre-Owned-Tablets.jpg"
                }
            ]
        }
    }
]


const country_id = 1;

async function elasticsearch() {
    try {
        const { Client } = require('@elastic/elasticsearch')

        const client = new Client({
            node: 'http://20.238.38.143:9200/',
            auth: {
                username: 'elastic',
                password: 'D11HRXJ1jdjpSNpmo9Oj'
            },
        })
        client.info()
            .then(response => { })
            .catch(error => console.error(error))
        return client
    } catch (error) {
        return console.log(`elastic search Could not connect - ${error}`);
    }
}

function createPool() {
    try {
        const mysql = require('mysql2');
        // Test Server //
        const pool = mysql.createPool({
            host: "localhost",
            user: "root",
            password: "password",
            port: "3307",
            database: "ourshopee",
            connectionLimit: 10,
            waitForConnections: true,
            multipleStatements: true,
            queueLimit: 0
        });
        // Production Server //
        // const pool = mysql.createPool({
        //     host: "sql-proxy.private.ourshopee.com",
        //     user: "ourshopeexuser",
        //     password: "Bho909Bnv76sCdyDfgkUcb4dfe",
        //     port: "6033",
        //     database: "ourshope_maindb",
        //     connectionLimit: 10,
        //     waitForConnections: true,
        //     multipleStatements: true,
        //     queueLimit: 0
        // });
        const promisePool = pool.promise();
        return promisePool;
    } catch (error) {
        return console.log(`Could not connect - ${error}`);
    }
}

const pool = createPool();

module.exports = {
    base_url: process.env.base_url,
    port: process.env.port,
    elastic: process.env.elastic,
    config_data: config_data,
    country_id: country_id,
    elasticsearch: elasticsearch,
    connection: async () => pool.getConnection(),
    execute: (...params) => pool.execute(...params)
}