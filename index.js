const axios = require('axios').default;

// (async function () {
//     try {
//         const raw = await axios.get('https://www.wildberries.ru/catalog/7399431/detail.aspx?targetUrl=XS');
//         console.log(raw.data);
//     } catch (err) {
//         console.log(err);
//     }
// }());
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const bluebird = require("bluebird");

const withBrowser = async (fn) => {
    const browser = await puppeteer.launch({ slowMo: 40 });
    // const browser = await puppeteer.launch({ headless: false, slowMo: 40 });
    try {
        return await fn(browser);
    } finally {
        await browser.close();
    }
}

const withPage = (browser) => async (fn) => {
    const page = await browser.newPage();
    try {
        return await fn(page);
    } finally {
        await page.close();
    }
}
let items = [];

(async function () {
    try {
        const searchText = 'сумка';

        // const browser = await puppeteer.launch({ slowMo: 20 });
        let start = new Date();

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox'],
            slowMo: 10
        });
        const page = await browser.newPage();
        // await page.setViewport({ width: 1580, height: 800 })
        await page.goto('https://www.wildberries.ru/catalog/0/search.aspx');
        await page.waitForSelector('body > div.wrapper > header > div > div.header__bottom > div.header__search-catalog.search-catalog.j-search-catalog > div.search-catalog__block > input');
        await page.$eval('body > div.wrapper > header > div > div.header__bottom > div.header__search-catalog.search-catalog.j-search-catalog > div.search-catalog__block > input', el => el.value = 'сумка');
        await page.click('body > div.wrapper > header > div > div.header__bottom > div.header__search-catalog.search-catalog.j-search-catalog > div.search-catalog__block > div.search-catalog__btn-wrap > button.search-catalog__btn.search-catalog__btn--search.j-btn-search');
        await page.waitForSelector('#catalog-content');
        const catalog = await page.$eval('#catalog', el => el.innerHTML);
        sleep(200);
        await browser.close();
        console.log('search');
        console.log(Math.abs((new Date().getTime() - start.getTime()) / 1000));
        let $ = cheerio.load(catalog);
        // var filters = parseFilters($);
        // console.log(filters);

        let urls = [];
        $('#catalog-content > div > div').each(function (i, e) {
            if (i < 5) {
                const url = 'https://www.wildberries.ru' + $(this).children().find('a').attr('href');
                urls.push(url);
                items.push({
                    id: $(this).attr('data-popup-nm-id'),
                    url: url,
                    image: 'https:' + $(this).children().find('img').attr('src'),
                    price: $(this).children().find('.lower-price').text().trim(),
                    parameters: [],
                });
            }
        });

        for (const item of items) {
            try {
                const raw = await axios.get(item.url);
                // console.log(raw.data);
                const $ = cheerio.load(raw.data);
                $('.product-params__table > tbody > tr.product-params__row').each(function (i, e) {
                    const name = $(this).find('th').text().trim();
                    const newLocal = !name.includes('упаковк') && !name.includes('Вес с упаковкой') && !name.includes('Вес без упаковки') && !name.includes('Ширина упаковки') &&
                        !name.includes('Высота упаковки') && !name.includes('Глубина упаковки');
                    if (newLocal === true) {
                        item.parameters.push({
                            name: name,
                            value: $(this).find('td').text().trim()
                        });
                    }
                });
            } catch (err) {
                console.log(err);
            }
        }
        // const items1 = await bluebird.map(items, async (product) => {
        //     return withPage(browser)(async (page) => {
        //         const item = await parseItemPage(page, product);
        //         // console.log(new Date());
        //         return item;
        //     });
        // }, { concurrency: 5 });


        // await page.screenshot({ path: 'example.png' });

        // const items1 = [];
        // for (const item of items) {
        //     console.log(item);
        //     await parseItemPage(browser, item).then(param => {
        //         item.parameters = param;
        //     });

        //     console.log(new Date());
        //     // (async function () {
        //     // await withPage(browser)(async (page) => {
        //     // await parseItemPage(page, item).then(parameters => {
        //     // console.log(parameters);
        //     // items1.push(parameters);
        //     // });
        //     // });
        //     // });

        //     // await parseItemPage(page, item).then(item => {
        //     // items1.push(item);
        //     // });
        // }

        // const items1 = await withBrowser(async (browser) => {
        //     return bluebird.map(items, async (product) => {
        //         return withPage(browser)(async (page) => {
        //             const item = await parseItemPage(page, product);
        //             // console.log(new Date());
        //             return item;
        //         });
        //     }, { concurrency: 5 });
        // });



        // const items1 = await bluebird.map(items, async (product) => {
        //     return withPage(browser)(async (page) => {
        //         const item = await parseItemPage(page, product);
        //         // console.log(new Date());
        //         return item;
        //     });
        // }, { concurrency: 5 });

        console.log(Math.abs((new Date().getTime() - start.getTime()) / 1000));

        // const items1 = async function (browser) {
        //     return bluebird.map(items, async (product) => {
        //         return withPage(browser)(async (page) => {
        //             const item = await parseItemPage(page, product);
        //             return item;
        //         });
        //     }, { concurrency: 5 });
        // }(browser);

        // console.log(items);
        // console.log("itemsitemsitemsitemsitems\n\n\n\n\n");

        console.log(items);
        // sleep(200);
        // await browser.close();

        //         for (const item of items) {
        //             console.log(item.id);
        //             console.log(item.url);
        //             // withPage(item.url);
        //             return bluebird.map(urls, async (url) => {
        //                 return withPage(browser)(async (page) => {
        //                     const item = await parseMessagePage(page, url);
        //                     countHandled++;
        //                     console.log('countHandled ' + countHandled);
        //                     // console.log(item);
        //                     return item;
        //                     // return await parseMessagePage(page, url);
        //                 });
        //             }, { concurrency: 4 });
        // );
        //             for (const val of item.parameters) {
        //                 console.log(val);
        //             }
        //         }

        // const rawResposne = await axios.get('https://wbxcatalog-ru.wildberries.ru/brands/t/catalog?search=Tefal', {
        //     headers: {
        //         "accept": "*/*",
        //         "accept-language": "en,ru;q=0.9",
        //         // "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Yandex\";v=\"91\", \"Chromium\";v=\"91\"",
        //         "sec-ch-ua-mobile": "?0",
        //         "sec-fetch-dest": "empty",
        //         "sec-fetch-mode": "cors",
        //         "sec-fetch-site": "same-site"
        //     },
        // });
        // const data = rawResposne.data;
        // console.log(data);
        // const search = 'https://www.wildberries.ru/catalog/0/search.aspx?xfilters=xsubject%3Bdlvr%3Bbrand%3Bprice%3Bkind%3Bcolor%3Bwbsize%3Bseason%3Bconsists&xparams=subject%3D1192&xshard=appliances&search=%D0%B2%D0%B5%D0%BD%D1%82%D0%B8%D0%BB%D1%8F%D1%82%D0%BE%D1%80';
        // const rawResposne = await axios.get(search, {
        //     headers: {
        //         "Accept": "*/*",
        //         "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
        //         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0",
        //     }
        // });
        // const data = rawResposne.data;
        // console.log(data);
        // const $ = cheerio.load(data);
        // const item = $('#catalog-content > div').html();
        // console.log(item);
    } catch (err) {
        console.log(err);
    }
}());

async function parseItemPage(page, item) {
    // const page = await browser.newPage();
    // await page.setViewport({ width: 1580, height: 800 })
    await page.goto(item.url);
    // await page.goto('https://www.wildberries.ru/catalog/7399431/detail.aspx?targetUrl=XS');
    // sleep(40);
    await page.waitForSelector('.product-params');
    // await page.waitForSelector('#catalog-content');
    const parametersHtml = await page.$eval('#container > div.product-detail__section-wrap > div.product-detail__details-wrap > section:nth-child(2) > div:nth-child(3) > div > div.collapsable__content.j-add-info-section > div', el => el.innerHTML);
    const $ = cheerio.load(parametersHtml);

    // console.log($('.same-part-kt__article').last().text().trim());

    // var parameters = [];

    $('.product-params__table > tbody > tr.product-params__row').each(function (i, e) {
        const name = $(this).find('th').text().trim();
        const newLocal = !name.includes('упаковк') && !name.includes('Вес с упаковкой') && !name.includes('Вес без упаковки') && !name.includes('Ширина упаковки') &&
            !name.includes('Высота упаковки') && !name.includes('Глубина упаковки');
        if (newLocal === true) {
            item.parameters.push({
                name: name,
                value: $(this).find('td').text().trim()
            });
        }
    });

    // await page.screenshot({ path: `example-${item.id}.png` });

    return item
}

function parseFilters($) {
    const data = $('#filters').children().get();
    data.forEach(e => {
        console.log(e.name);
    });
    var filters = [];

    $('#filters').filter(function () {
        var data = $(this);
        data.children('.filter-title-text').each((i, v) => {
            const filterName = $(v).text();
            filters.push(filterName);
        });
    });
    $('#filters').children('div').each((i, v) => {
        console.log(v.innerHTML);
    });

    return filters;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// // await axios.get("https://wbxcatalog-ru.wildberries.ru/brands/t/catalog?spp=0&regions=64,79,4,38,30,33,70,1,22,31,66,80,69,48,40,68&stores=119261,122252,122256,121631,122466,122467,122495,122496,122498,122590,122591,122592,123816,123817,123818,123820,123821,123822,124093,124094,124095,124096,124097,124098,124099,124100,124101,124583,124584,117986,1733,116433,120762,119400,117501,507,3158,2737,1699,686,1193,117413,119781&pricemarginCoeff=1.0&reg=0&appType=1&offlineBonus=0&onlineBonus=0&emp=0&locale=ru&lang=ru&curr=rub&couponsGeo=2,12,6,7,3,18,21&brand=7158&xfilters=xsubject%3Bdlvr%3Bbrand%3Bprice%3Bkind%3Bcolor%3Bwbsize%3Bseason%3Bconsists&xparams=brand%3D7158&xshard=brands%2Ft&search=Сумка", {
// //     headers: {
// //         "accept": "*/*",
// //         "accept-language": "en,ru;q=0.9",
// //         "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Yandex\";v=\"91\", \"Chromium\";v=\"91\"",
// //         "sec-ch-ua-mobile": "?0",
// //         "sec-fetch-dest": "empty",
// //         "sec-fetch-mode": "cors",
// //         "sec-fetch-site": "same-site"
// //     },
// // });