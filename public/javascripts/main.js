'use strict';

const RESPONSE_OK = 0;
const BASE_URL = 'https://wildberries-catalog.herokuapp.com';
// const BASE_URL = 'http://localhost:3000';

function drawSearchResults(products, allParameterNames) {
    let allParameters = new Map();

    let i = 0;
    let productsElement = getElementById('products');
    productsElement.innerHTML = "";

    let html = '<th class="table-cell table-header"></th><th class="table-cell table-header">URL</th><th class="table-cell table-header">Цена</th>';

    for (let name of allParameterNames) {
        html += `<th class="table-cell table-header">${name.toUpperCase()}</th>`;
        allParameters.set(name, i);
        i++;
    }
    let tableHeadRow = document.createElement('tr');
    tableHeadRow.innerHTML = html;
    productsElement.appendChild(tableHeadRow);

    let table = [];
    let keywordMap = new Map();
    products.forEach(product => {

        let productParamMap = new Map();

        for (let keywords of product.parameters) {
            productParamMap.set(keywords.name, keywords.value);
            keywords.value.split(';').forEach(keyword => {
                const key = keyword.toLowerCase().trim();
                let keyValue = keywordMap.get(key);
                // console.log('keyValue');
                // console.log(keyValue);
                if (keyValue === undefined) {
                    keyValue = 1;
                } else {
                    keyValue++;
                }

                keywordMap.set(key, keyValue);
            });
        }

        let row = [];
        row.push(product.name);
        row.push(`https://www.wildberries.ru/catalog/${product.id}/detail.aspx?targetUrl=WR`);
        row.push(product.salePriceU);
        for (let name of allParameters.keys()) {
            let value = productParamMap.get(name);
            // console.log(value);
            if (value === undefined) {
                row.push('-');
            } else {
                row.push(value);
            }
        }

        table.push(row);
    });

    table.forEach(row => {
        let innerHTML = ``;
        let i = 0;
        for (let cellValue of row) {
            if (cellValue === '-') {
                innerHTML += `<td class="table-cell keyword-empty">${cellValue}</td>`;
            } else if (i === 2) {
                innerHTML += `<td class="table-cell">${cellValue / 100}</td>`;
            } else if (i > 2) {
                innerHTML += `<td class="table-cell">`;
                let keywords = cellValue.split(';');
                let j = 0;
                for (let keyword of keywords) {
                    const key = keyword.toLowerCase().trim();
                    let count = keywordMap.get(key);
                    // console.log('count');
                    // console.log(key);
                    // console.log(count);
                    if (count === undefined || count <= 1 || (count > 1 && keyword.includes(' шт.'))) {
                        innerHTML += `<span class="keyword" >${key}</span>`;
                    } else if (count > 1) {
                        innerHTML += `<span class="keyword keyword-duplicated" >${key}</span>`;
                    }
                    if (keywords.length > 1 && j < keywords.length) {
                        innerHTML += '; ';
                    }
                    j++;
                }
                innerHTML += `</td>`;
            } else {
                if (i < 1) {
                    innerHTML += `<td class="table-cell table-header">${cellValue}</td>`;
                } else {
                    innerHTML += `<td class="table-cell"><a href="${cellValue}" target="_blank"><span style="color: #000000;">${cellValue}</span></a></td>`;
                }
            }
            i++;
        }

        table.push(row);

        let productElement = document.createElement('tr');
        productElement.innerHTML = innerHTML;
        productsElement.appendChild(productElement);
    });
}

let currentPage = 0;

async function searchProductsOnWildberries(searchString) {
    let productsElement = getElementById('products');
    try {
        localStorage.removeItem('searchTitle')
        localStorage.removeItem('allParameterNames');
        localStorage.removeItem('productsResult');

        productsElement.innerHTML = "Идет поиск...";
        let response = await doGet(`/api/search?search=${searchString}`);
        // console.log(response.data);
        const searchTitleElement = getElementById('searchTitle');
        unHide(searchTitleElement);
        searchTitleElement.innerText = `Результаты поиск «${capitalizeFirstLetter(searchString)}»`;
        let products = response.data;

        drawSearchResults(products, response.paramNames);
        localStorage.setItem('searchTitle', searchString)
        localStorage.setItem('allParameterNames', response.paramNames);
        localStorage.setItem('productsResult', JSON.stringify(products));
        return true;
    } catch (err) {
        productsElement.innerHTML = "Ничего не найдено...";
        console.log(err);
        return false;
    }
}

function getBinarySize(string) {
    return Buffer.byteLength(string, 'utf8');
}

function setSearchSearchTitleText(searchTitleElement, searchTitle) {
    searchTitleElement.innerText = `Результаты поиск «${capitalizeFirstLetter(searchTitle)}»`;
}

function unHide(element) {
    element.classList.remove('hide');
}

function getElementById(id) {
    return document.getElementById(id);
}
function hide(element) {
    element.classList.add('hide');
}

async function main() {
    let alertElement = getElementById('alert');
    const EVENTS_CHANNEL = 'events';
    EventBus.subscribe(EVENTS_CHANNEL, (data) => {
        unHide(alertElement);
        alertElement.innerText = data;
        setTimeout(() => {
            hide(alertElement);
            alertElement.innerHTML = "";
        }, 5000);
    });


    const currentLocation = document.location.href;
    console.log("curr" + currentLocation);

    // let includes = currentLocation.includes(BASE_URL + '/search?search=');
    // console.log(includes);
    // if (includes) {
    //     await searchProductsOnWildberries(currentLocation.substr((BASE_URL + '/search?search=').length));
    // }

    // let signUpElement = getElementById('signUp');
    // let signInElement = getElementById('signIn');
    // let logoutElement = getElementById('logoutBtn');
    // let usernameElement = getElementById('username');
    // const accessToken = getCookie('token');
    //
    // logoutElement.addEventListener('click', (e) => {
    //     e.preventDefault();
    //     eraseCookie('token');
    //         unHide(signUpElement);
    //         unHide(signInElement);
    //         hide(usernameElement);
    //         hide(logoutElement);
    // });
    //
    // let userFormElement = getElementById('userForm');
    // let actionElement = getElementById('action');
    //
    // signUpElement.addEventListener('click', async (e) => {
    //     e.preventDefault();
    //     actionElement.innerText = 'Sign Up';
    //     userFormElement.setAttribute('data-action', 'signUp');
    //         unHide(userFormElement);
    // });
    //
    // signInElement.addEventListener('click', async (e) => {
    //     e.preventDefault();
    //     actionElement.innerText = 'Sign In';
    //     userFormElement.setAttribute('data-action', 'signIn');
    //       unHide(userFormElement);
    // });
    //
    // let submitUserFormButton = getElementById('submitUserForm');
    //
    // submitUserFormButton.addEventListener('click', async (e) => {
    //     e.preventDefault();
    //
    //     let usernameInput = getElementById('usernameInput');
    //     let passwordInput = getElementById('passwordInput');
    //     const username = usernameInput.value
    //     const config = {
    //         method: 'POST',
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({username: username, password: passwordInput.value})
    //     };
    //     try {
    //         const action = userFormElement.getAttribute('data-action');
    //
    //         const rawResponse = await fetch(`${BASE_URL}/users/${action}`, config);
    //         const content = await rawResponse.json();
    //         if (content !== 'failed') {
    //             document.cookie = `token=${content}`;
    //               unHide(usernameElement);
    //             usernameElement.innerText = `Hello ${username}`;
    //             hide(signUpElement);
    //             hide(signInElement);
    //             unHide(logoutElement);
    //         }
    //
    //         // EventBus.publish(EVENTS_CHANNEL, "Success signpu");
    //     } catch (err) {
    //         console.log(err);
    //         // EventBus.publish(EVENTS_CHANNEL, "Failed signup");
    //     }
    // })

    let searchFormElement = getElementById('searchForm');
    let searchInputElement = getElementById('searchInput');
    let newSearchButton = getElementById('newSearch');
    let productsElement = getElementById('products');
    const productsResult = localStorage.getItem('productsResult');
    const allParameterNames = localStorage.getItem('allParameterNames');
    const searchTitle = localStorage.getItem('searchTitle');
    const searchTitleElement = getElementById('searchTitle');
    if (searchTitle !== null && productsResult !== null && productsResult !== undefined && allParameterNames !== null && allParameterNames !== undefined) {
        hide(searchFormElement);
        unHide(newSearchButton);
        unHide(searchTitleElement);
        setSearchSearchTitleText(searchTitleElement, searchTitle);
        drawSearchResults(JSON.parse(productsResult), allParameterNames.split(','));
    }

    searchFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        productsElement.innerHTML = "";
        hide(searchFormElement);
        let searchString = searchInputElement.value;
        await searchProductsOnWildberries(searchString);
        unHide(newSearchButton);
    });

    newSearchButton.addEventListener('click', (e) => {
        e.preventDefault();
        unHide(searchFormElement);
        searchInputElement.value = '';
        hide(searchTitleElement);
        hide(newSearchButton);
        productsElement.innerHTML = "";
    });

    const tableElement = getElementById('products');

    tableElement.addEventListener('click', function (e) {
        // e.preventDefault();
        let target = e.target;
        let text = target.innerText;
        let attribute = target.getAttribute('class');
        if (attribute !== null && attribute.includes('keyword')) {
            let copyTextarea = document.querySelector('#clipboard');
            copyTextarea.value = text;
            copyTextarea.style.position = 'fixed';
            copyTextarea.style.bottom = 0;
            copyTextarea.style.left = 0;
            copyTextarea.focus();
            copyTextarea.select();

            try {
                let successful = document.execCommand('copy');
                let msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
            } catch (err) {
                console.log('Oops, unable to copy');
            }
        }
    }, false);

    // if (accessToken !== undefined) {
    //     const payload = parseJwt(accessToken);
    //     hide(signInElement);
    //     hide(signUpElement);
    //     unHide(logoutElement)
    //     console.log(payload);
    //
    //     console.log(payload.username);
    //     usernameElement.innerText = `Hello ${payload.username}`;
    //
    //     const rawResponse = await fetch(`${BASE_URL}/users/1`, {
    //         method: 'GET',
    //         headers: {
    //             'Accept': 'application/json',
    //             'Authorization': `Bearer ${accessToken}`,
    //         },
    //     });
    //
    //     const content = await rawResponse.text();
    //     console.log(content);
    // } else {
    //     unHide(signInElement);
    //     unHide(signUpElement);
    //     hide(logoutElement)
    //     console.log("token not found");
    // }
}

async function doGet(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    return await response.json();
}

(async function () {
    await main();
}());
//
// window.addEventListener('load', async () => {
//     await main();
// });
