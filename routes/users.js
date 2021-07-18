let express = require('express');
const app = require('../app');
let router = express.Router();
const mariadb = require('mariadb');
const jwt = require('jsonwebtoken');
const utils = require('../Utils/Utils');
const Cryptr = require('cryptr');
const crypt = new Cryptr("qwerty");

const secret = process.env.TOKEN_SECRET;

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 1
});

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource. Requested at' + req.requestTime + __dirname);
});

// router.get('/:ID', function (req, res, next) {
//     // res.send('responsd user id ' + req.params.ID);
//     if (req.params.id === 0) {
//         next('route');
//     } else {
//         next();
//     }
// }, function (req, res, next) {
//     res.render('regular');
// });

router.get('/:ID', utils.authenticateToken, function (req, res, next) {
    res.render('special');
});

router.get('/download', function (req, res) {
    console.log(__dirname);
    // res.send(__dirname);
    res.download(`${__dirname}/index.js`);
})

router.post('/signIn', async function (req, res, next) {
    const { username, password } = req.body;
    if (!utils.isset(username, password)) {
        res.status = 400;
        res.send("Bad request. username or password not setted");
        return
    }
    const connection = await pool.getConnection();
    const rows = await connection.query("SELECT 1 as val");
    console.log(rows);
    try {
        const result = await connection.query('SELECT * FROM users WHERE username = ?;', [username]);

        if (result.length === 0 && utils.checkPassword(crypt, password, result[0].password)) {
            res.sendStatus(404);
            return
        }

        res.json(utils.generateAccessToken(username));
    } catch (err) {
        console.log(err);
        res.status(409)
        res.json("failed");
        throw err;
    } finally {
        if (connection) {
            return connection.end();
        }
    }
});

router.post('/signUp', async function (req, res, next) {
    const { username, password } = req.body;
    if (!utils.isset(username, password)) {
        res.status = 400;
        res.send("Bad request. username or password not setted");
        return
    }

    console.log(req.Body);
    const connection = await pool.getConnection();
    const rows = await connection.query("SELECT 1 as val");
    console.log(rows);
    try {
        const result = await connection.query("INSERT INTO users (username, passwd) VALUES (?,?)", [username, crypt.encrypt(password)]);
        console.log(result);
        await connection.end();
        res.json(utils.generateAccessToken(username));
    } catch (err) {
        console.log(err);
        res.status(409)
        res.json("failed");
        throw err;
    } finally {
        if (connection) {
            return connection.end();
        }
    }
    // res.send('Got a POST request');
});

router.put('/', function (req, res) {
    res.send('Got a PUT request at /users');
});

router.delete('/', function (req, res) {
    res.send('Got a DELETE request at /users')
})

module.exports = router;