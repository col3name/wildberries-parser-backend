'use strict';

const RESPONSE_OK = 0;
const BASE_URL = 'https://wildberries-catalog.herokuapp.com';
// const BASE_URL = 'http://localhost:3000';

function drawSearchResults(products, allParameterNames) {
    let allParameters = new Map();

    console.log(allParameterNames);

    let i = 0;
    let productsElement = document.getElementById('products');
    productsElement.innerHTML = "";

    let html = '<th class="table-cell table-header"></th><th class="table-cell table-header">URL</th><th class="table-cell table-header">Цена</th>';

    for (let name of allParameterNames) {
        html += `<th class="table-cell table-header">${name}</th>`;
        allParameters.set(name, i);
        i++;
    }
    // console.log(productsElement);
    // console.log(html);
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
            console.log(value);
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
                    console.log('count');
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

async function handlePagination(EVENTS_CHANNEL, page = 0, limit = 10) {
    try {
        let response = await doGet(`/products?page=${page}&limit=${limit}`);
        console.log(response);
        if (!response.hasOwnProperty('code') && response.code !== RESPONSE_OK
            || !response.hasOwnProperty('data') || !response.hasOwnProperty('countPage')
        ) {
            EventBus.publish(EVENTS_CHANNEL, "invalid response");
        } else {
            drawSearchResults(response.data, []);
            return response.countPage;
        }
    } catch (err) {
        EventBus.publish(EVENTS_CHANNEL, "Err " + err);

        console.log(err);
    }

    return -1;
}

let currentPage = 0;

async function searchProductsOnWildberries(searchString) {
    let productsElement = document.getElementById('products');
    try {
        productsElement.innerHTML = "Идет поиск...";
        let response = await doGet(`/api/search?search=${searchString}`);
        console.log(response.data);
        drawSearchResults(response.data, response.paramNames);
    } catch (err) {
        productsElement.innerHTML = "Ничего не найдено...";
        console.log(err);
    }
}

async function main() {
    let alert = document.getElementById('alert');
    const EVENTS_CHANNEL = 'events';
    EventBus.subscribe(EVENTS_CHANNEL, (data) => {
        alert.classList.add('remove');
        alert.innerText = data;
        setTimeout(() => {
            alert.classList.add('hide');
            alert.innerHTML = "";
        }, 5000);
    });

    const currentLocation = document.location.href;
    console.log("curr" + currentLocation);

    let includes = currentLocation.includes(BASE_URL + '/search?search=');
    console.log(includes);
    if (includes) {
        await searchProductsOnWildberries(currentLocation.substr((BASE_URL + '/search?search=').length));
    }

    let signUpElement = document.getElementById('signUp');
    let signInElement = document.getElementById('signIn');
    let logoutElement = document.getElementById('logoutBtn');
    let usernameElement = document.getElementById('username');
    const accessToken = getCookie('token');

    logoutElement.addEventListener('click', (e) => {
        e.preventDefault();
        eraseCookie('token');
        usernameElement.classList.add('hide');
        signUpElement.classList.remove('hide');
        signInElement.classList.remove('hide');
        logoutElement.classList.add('hide');
    })

    let userFormElement = document.getElementById('userForm');
    let actionElement = document.getElementById('action');

    signUpElement.addEventListener('click', async (e) => {
        e.preventDefault();
        actionElement.innerText = 'Sign Up';
        userFormElement.setAttribute('data-action', 'signUp');
        userFormElement.classList.remove('hide');
    });

    signInElement.addEventListener('click', async (e) => {
        e.preventDefault();
        actionElement.innerText = 'Sign In';
        userFormElement.setAttribute('data-action', 'signIn');
        userFormElement.classList.remove('hide');
    });

    let submitUserFormButton = document.getElementById('submitUserForm');

    submitUserFormButton.addEventListener('click', async (e) => {
        e.preventDefault();

        let usernameInput = document.getElementById('usernameInput');
        let passwordInput = document.getElementById('passwordInput');
        const username = usernameInput.value
        const config = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username: username, password: passwordInput.value})
        };
        try {
            const action = userFormElement.getAttribute('data-action');

            const rawResponse = await fetch(`${BASE_URL}/users/${action}`, config);
            const content = await rawResponse.json();
            if (content !== 'failed') {
                document.cookie = `token=${content}`;
                usernameElement.classList.remove('hide');
                usernameElement.innerText = `Hello ${username}`;
                signUpElement.classList.add('hide');
                signInElement.classList.add('hide');
                logoutElement.classList.remove('hide');
            }

            // EventBus.publish(EVENTS_CHANNEL, "Success signpu");
        } catch (err) {
            console.log(err);
            // EventBus.publish(EVENTS_CHANNEL, "Failed signup");
        }
    })

    let searchFormElement = document.getElementById('searchForm');
    let searchInputElement = document.getElementById('searchInput');
    searchFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        let productsElement = document.getElementById('products');
        productsElement.innerHTML = "";
        let searchString = searchInputElement.value;
        await searchProductsOnWildberries(searchString);
    });

    document.addEventListener('click', function (e) {
        let target = e.target;
        let text = target.innerText;
        console.log(text);
        let attribute = target.getAttribute('class');
        if (attribute !== null && attribute.includes('keyword')) {
            let copyTextarea = document.querySelector('#clipboard');
            copyTextarea.value = text;
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

    if (accessToken !== undefined) {
        const payload = parseJwt(accessToken);
        signUpElement.classList.add('hide');
        signInElement.classList.add('hide');
        logoutElement.classList.remove('hide');
        console.log(payload);

        console.log(payload.username);
        usernameElement.innerText = `Hello ${payload.username}`;

        const rawResponse = await fetch(`${BASE_URL}/users/1`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const content = await rawResponse.text();
        console.log(content);
    } else {
        signUpElement.classList.remove('hide');
        signInElement.classList.remove('hide');
        logoutElement.classList.add('hide');
        console.log("token not found");
    }
}

async function doGet(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    return await response.json();
}

window.addEventListener('load', async () => {
    await main();
});
