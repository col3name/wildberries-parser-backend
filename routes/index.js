let express = require('express');
let router = express.Router();
const axios = require('axios').default;
const cheerio = require('cheerio');
// const mariadb = require('mariadb');
//
// const pool = mariadb.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     connectionLimit: 8
// });
const env = process.env;

const pg = require('pg');

// const pool = new Pool({
//     // host: 'localhost',
//     // user: 'postgres',
//     // password: 'postgres',
//     // database: 'wildberries',
//     // port: 5432,
//     host: env.DB_HOST || 'localhost',
//     port: env.DB_PORT || '5432',
//     user: env.DB_USER || 'postgres',
//     password: env.DB_PASSWORD || 'postgres',
//     database: env.DB_NAME || 'wildberries',
// });
pg.defaults.ssl = true;
const client = new pg.Client({
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || '5432',
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'wildberries',
    ssl: {
        rejectUnauthorized: false
    }
});

router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

async function measure(fn) {
    let start = new Date().getTime();
    const result = await fn();

    let end = new Date().getTime();
    let time = end - start;
    // console.log(result);
    // writeToFile(result);

    console.log('seconds: ' + time / 1000);
    console.log('minute: ' + time / 1000 / 60);
    console.log('hour: ' + time / 1000 / 60 / 60);
}

router.get('/api/search', async function (req, res) {
    // await measure(async () => {
    let httpStatus = 200;
    let code = 0;
    if (!req.query.hasOwnProperty('search')) {
        httpStatus = 400;
        code = 1;
        res.status(httpStatus);
        res.json({
            "code": code,
            "data": [],
            "message": "'search' query parameter required"
        });
    } else {
        res.status(httpStatus);
        let searchString = req.query.search;
        console.log(searchString);
        const products = await searchOnCatalog(searchString);
        let paramNames = new Set();
        if (products === null) {
            console.log("error");
            res.status(500);
            res.json({
                "code": 500,
                "data": [],
                "message": "Failed get result"
            });
        } else {
            let sql = `INSERT INTO products (product_key, title, parameters, price, url, image)
                       VALUES ($1, $2, $3, $4, $5, $6)`;
            let data = [];
            let i = 0;
            for (const product of products) {
                let newVar = await parseDetails(product.id);
                for (let param of newVar.parameters) {
                    paramNames.add(param.name);
                }

                product['parameters'] = newVar.parameters;
                product['image'] = newVar.image;
                data.push(product.id);
                data.push(product.name);
                data.push(JSON.stringify(product.parameters));
                data.push(product.salePriceU);
                data.push(`https://www.wildberries.ru/catalog/${product.id}/detail.aspx?targetUrl=XS`);
                data.push(product.image);

                if (i >= 6) {
                    sql += `,($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`;
                }
                i += 6;
            }
            sql += ';';

            console.log(sql);
            console.log(data);

            try {
                await client.connect();
                try {
                    const result = await client.query(sql, data);
                    console.log(result.rows[0]);
                    res.json({
                        "code": code,
                        "data": products,
                        "paramNames": Array.from(paramNames),
                        "message": "ok"
                    });
                } catch (err) {
                    console.log('sql');
                    console.log(err);
                    res.status(409)
                } finally {
                    client.end();
                }
            } catch (err) {
                console.log('pool');
                console.log(err);
                res.status(409)
            }
            // console.log(sql);
            // console.log(data);
            // try {
            //     const connection = await pool.getConnection();
            //     const rows = await connection.query("SELECT 1 as val");
            //     console.log(rows);
            //     try {
            //         const result = await connection.query(sql, data);
            //         console.log(result);
            //         // res.json({ code: code, data: result, message: 'success' });
            //         await connection.end();
            //         res.json({
            //             "code": code,
            //             "data": products,
            //             "paramNames": Array.from(paramNames),
            //             "message": "ok"
            //         });
            //     } catch (err) {
            //         if (connection) {
            //             await connection.end();
            //         }
            //         console.log(err);
            //         res.status(409)
            //         throw err;
            //     }
            // } catch (err) {
            //     console.log(err);
            //     res.status(409)
            //     throw err;
            // }
        }
    }
    // });
});

async function searchOnCatalog(searchString, limit = 5) {
    try {
        const searchStringEncoded = encodeURIComponent(searchString);
        const commonUrl = 'https://wbxsearch.wildberries.ru/exactmatch/v2/common?query=' + searchStringEncoded;
        const commonData = await doGetJson(commonUrl);
        let query = 'https://wbxcatalog-ru.wildberries.ru/';
        if (commonData.hasOwnProperty('shardKey') && commonData.hasOwnProperty('query') && commonData.hasOwnProperty('filters')) {
            query += commonData.shardKey + `/catalog?spp=0&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&count=10&maxPage=10&search=${searchStringEncoded}&${commonData.query}&?xfilters=${encodeURIComponent(commonData.filters)}`;
            // console.log(query);
            let data = await doGetJson(query);
            return data.data.products.slice(0, limit);
        } else {
            return null;
        }
    } catch
        (e) {
        console.log(e);
        return null;
    }
}

async function parseDetails(productId) {
    let url = `https://www.wildberries.ru/catalog/${productId}/detail.aspx?targetUrl=XS`;
    console.log(url);
    const raw = await doGetJson(url);
    const $ = cheerio.load(raw);
    const result = {
        parameters: [],
        image: '',
    };

    result.image = 'https:' + $('#imageContainer > div > img.photo-zoom__preview.j-zoom-preview').attr('src');
    // console.log(img);

    $('.product-params__table > tbody > tr.product-params__row').each(function (i, e) {
        const name = $(this).find('th').text().trim();
        const newLocal = !name.includes('Высота') && !name.includes('Ширина') && !name.includes('Глубина') && !name.includes('упаковк');
        if (newLocal === true) {
            result.parameters.push({
                name: name,
                value: $(this).find('td').text().trim()
            });
        }
    });

    return result;
}

async function doGetJson(url) {
    const rawResp = await axios.get(url, {
        "headers": {
            "accept": "*/*",
            "accept-language": "en,ru;q=0.9",
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Yandex\";v=\"91\", \"Chromium\";v=\"91\"",
            // "sec-ch-ua-mobile": "?0",
            // "sec-fetch-dest": "empty",
            // "sec-fetch-mode": "cors",
            // "sec-fetch-site": "same-site"
        },
    });

    return rawResp.data;
}

module.exports = router;
