let express = require('express');
let router = express.Router();
const axios = require('axios').default;
const cheerio = require('cheerio');
const config = require('../config');
const pool = config.getDbPool();

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

router.get('/search', async function (req, res) {
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
                product['name'] = newVar.name;
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
                const result = await pool.query(sql, data);
                console.log(result.rows[0]);
                res.json({
                    "code": code,
                    "data": products,
                    "paramNames": Array.from(paramNames),
                    "message": "ok"
                });
            } catch (err) {
                setTimeout(function () {
                    pool.connect();
                }, 10000);
                console.log('sql');
                console.log(err);
                res.status(409)
            }
        }
    }
});

async function searchOnCatalog(searchString, limit = 5) {
    try {
        const searchStringEncoded = encodeURIComponent(searchString);
        // https://www.wildberries.ru/search/exactmatch/common?query=%D1%80%D1%8E%D0%BA%D0%B7%D0%B0%D0%BA+%D0%BB%D0%B8%D1%81%D1%8B+%D0%BA%D0%B0%D0%BA%D1%82%D1%83%D1%81
        const commonUrl = 'https://wbxsearch.wildberries.ru/exactmatch/v2/common?sort=popular&query=' + searchStringEncoded;
        const commonData = await doGetJson(commonUrl);
        // console.log(commonData);
        let query = 'https://wbxcatalog-ru.wildberries.ru/';
        if (commonData.hasOwnProperty('shardKey') && commonData.hasOwnProperty('query') && commonData.hasOwnProperty('filters')) {
            query += commonData.shardKey + `/catalog?spp=0&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&count=10&maxPage=10&search=${searchStringEncoded}&${commonData.query}&?xfilters=${encodeURIComponent(commonData.filters)}`;
            // console.log(query);
            let data = await doGetJson(query);
            return data.data.products.slice(0, limit);
        } else {
            return null;
            // query += commonData.shardKey + `/catalog?spp=0&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&count=10&maxPage=10&search=${searchStringEncoded}&${commonData.query}&?xfilters=${encodeURIComponent(commonData.filters)}`;
            // // console.log(query);
            // let data = await doGetJson(query);
            // return data.data.products.slice(0, limit);
        }
        // https://www.wildberries.ru/search/extsearch/catalog?spp=0&regions=64,79,4,38,30,33,70,1,22,31,66,80,69,48,40,68&stores=119261,122252,122256,121631,122466,122467,122495,122496,122498,122590,122591,122592,123816,123817,123818,123820,123821,123822,124093,124094,124095,124096,124097,124098,124099,124100,124101,124583,124584,117986,1733,116433,120762,119400,117501,507,3158,2737,1699,686,1193,117413,119781&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&couponsGeo=2,12,6,7,3,18,21&search=%D1%80%D1%8E%D0%BA%D0%B7%D0%B0%D0%BA%20%D0%BB%D0%B8%D1%81%D1%8B%20%D0%BA%D0%B0%D0%BA%D1%82%D1%83%D1%81&xparams=search%3D%D1%80%D1%8E%D0%BA%D0%B7%D0%B0%D0%BA+%D0%BB%D0%B8%D1%81%D1%8B+%D0%BA%D0%B0%D0%BA%D1%82%D1%83%D1%81&xshard=&search=%D1%80%D1%8E%D0%BA%D0%B7%D0%B0%D0%BA+%D0%BB%D0%B8%D1%81%D1%8B+%D0%BA%D0%B0%D0%BA%D1%82%D1%83%D1%81&sort=popular
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
        name: '',
    };

    result.image = 'https:' + $('#imageContainer > div > img.photo-zoom__preview.j-zoom-preview').attr('src');
    result.name = $('#container > div.product-detail__same-part-kt.same-part-kt > div > div.same-part-kt__header-wrap > h1').text();
    // console.log(img);

    $('.product-params__table > tbody > tr.product-params__row').each(function (i, e) {
        const name = $(this).find('th').text().trim();
        let lowerCase = name.toLowerCase();
        const newLocal = !lowerCase.includes('высота') && !lowerCase.includes('ширина') && !lowerCase.includes('глубина') && !lowerCase.includes('упаковк');
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
