// console.log('split'.split(';'));
// console.log('spl;i;t'.split(';'));
// let map = new Map();
// map.set(1, "2");
// map.set(2, "3");
// map.set(4, 4);
// console.log(map.get(4));
const axios = require('axios').default;
// const fetch = require('node-fetch');
const fs = require('fs');
const cheerio = require('cheerio');
let ParallelRequest = require('parallel-http-request');
let request = new ParallelRequest();

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

    // console.log(rawResp);
    return rawResp.data;
}

async function doGetBody(url) {
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

    return rawResp;
}


function writeToFile(data, outputPath = "input.json") {
    fs.writeFile(outputPath, JSON.stringify(data), function (err) {
            if (err) throw err;
            console.log('complete');
        }
    );
}

async function test(count) {
    let result = [];
    let searchStringEncoded = `${encodeURIComponent(process.argv[3])}`;
    const commonUrl = 'https://wbxsearch.wildberries.ru/exactmatch/v2/common?query=' + searchStringEncoded;
    let commonData = await doGetJson(commonUrl);
    console.log(commonData);
    let query = 'https://wbxcatalog-ru.wildberries.ru/';
    query += commonData.shardKey + `/catalog?spp=0&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&count=10&maxPage=10search=${searchStringEncoded}&${commonData.query}&?xfilters=${encodeURIComponent(commonData.filters)}`;
    console.log(query);
    for (let i = 0; i < count; i++) {
        try {
            let data = await doGetJson(query);
            console.log(data);

            result.push(data);
            console.log(i)
        } catch (e) {
            console.log(e);
            console.log("failed after " + i + " request");
        }
    }
    writeToFile(result, "input.json");
    return result;
}

async function handle() {
    let searchString = 10;
    console.log(process.argv);
    if (process.argv.length > 2) {
        searchString = process.argv[2];
    }
    //
    // let newVar = await parseDetails(22898405);
    // console.log(newVar);
    // return 0;
    let start = new Date().getTime();

    console.log('search' + searchString);
    const products = await searchOnCatalog(searchString);
    if (products === null) {
        console.log("error");
    } else {
        // writeToFile(products);
        for (const product of products) {
            // request.add( {url:`https://www.wildberries.ru/catalog/${product.id}/detail.aspx?targetUrl=XS`,method:'get'})
           // await measure(async() =>{
                let newVar = await parseDetails(product.id);
                // console.log(newVar);
                product['par1ameters'] = newVar;
            // });

        }
        // let count = 0;
        // request.send(function (response) {
        //     count++;
        //
        //     // console.log(count);
        //     for (const item of response) {
        //         // console.log(item.url);
        //         let data = parseDetailHtml(item.body);
        //         // console.log(data);
        //     }
        //     console.log("\n\n\n\nbababaababababbab\n\n\n\n\n");
        //     let end = new Date().getTime();
        //     let time = end - start;
        //     // console.log(result);
        //     // writeToFile(result);
        //
        //     console.log('parse seconds: ' + time / 1000);
        //     console.log('parse minute: ' + time / 1000 / 60);
        //     console.log('parse hour: ' + time / 1000 / 60 / 60);
        // });
        // request.add({url:'https://jsonplaceholder.typicode.com/posts/1',method:'get'})
        //     .add({url:'https://jsonplaceholder.typicode.com/posts/2',method:'get'})
        //     .send(function(response){
        //         console.log(response);
        //     });
    }
    writeToFile(products);

    return products;
}

(async function () {
    await measure(async () => await handle());
}());

async function searchOnCatalog(searchString, limit = 5) {
    try {
        const searchStringEncoded = encodeURIComponent(searchString);
        const commonUrl = 'https://wbxsearch.wildberries.ru/exactmatch/v2/common?query=' + searchStringEncoded;
        const commonData = await doGetJson(commonUrl);
        // console.log(commonData);
        let query = 'https://wbxcatalog-ru.wildberries.ru/';
        query += commonData.shardKey + `/catalog?spp=0&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&count=10&maxPage=10&search=${searchStringEncoded}&${commonData.query}&?xfilters=${encodeURIComponent(commonData.filters)}`;
        // console.log(query);
        let data = await doGetJson(query);
        // console.log(data);

        return data.data.products.slice(0, limit);
    } catch (e) {
        console.log(e);
        return null;
    }
}

function parseDetailHtml(raw) {
    const $ = cheerio.load(raw);
    const parameters = [];
    let img = $('#imageContainer > div > img.photo-zoom__preview.j-zoom-preview').attr('src');
    // console.log(img);
    $('.product-params__table > tbody > tr.product-params__row').each(function (i, e) {
        const name = $(this).find('th').text().trim();
        const newLocal = !name.includes('упаковк') && !name.includes('Вес с упаковкой') && !name.includes('Вес без упаковки') && !name.includes('Ширина упаковки') &&
            !name.includes('Высота упаковки') && !name.includes('Глубина упаковки');
        if (newLocal === true) {
            parameters.push({
                name: name,
                value: $(this).find('td').text().trim()
            });
        }
    });
    return parameters;
}

async function parseDetails(productId) {
    let url = `https://www.wildberries.ru/catalog/${productId}/detail.aspx?targetUrl=XS`;
    // console.log(url);
    const raw = await doGetJson(url);
    return parseDetailHtml(raw);
}

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