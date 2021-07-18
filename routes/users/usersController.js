let express = require('express');
const app = require('../../app');
let router = express.Router();
// const jwt = require('jsonwebtoken');
const utils = require('../../Utils/Utils');
const Cryptr = require('cryptr');
const crypt = new Cryptr("qwerty");
const config = require('../../config');
const pool = config.getDbPool();

// const secret = process.env.TOKEN_SECRET;

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

// router.get('/:ID', utils.authenticateToken, function (req, res, next) {
// //     res.render('special');
// // });

// router.get('/download', function (req, res) {
//     console.log(__dirname);
//     // res.send(__dirname);
//     res.download(`${__dirname}/main.js`);
// })

router.post('/signIn', async function (req, res, next) {
    const { username, password } = req.body;

    if (!utils.isset(username, password)) {
        res.status = 400;
        res.send("Bad request. username or password not setted");
        return
    }
    // const connection = await pool.getConnection();
    const rows = await pool.query("SELECT 1 as val");
    console.log(rows);
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1;', [username]);

        let user = result.rows[0];
        if (result.length === 0 && utils.checkPassword(crypt, password, user.password)) {
            res.sendStatus(404);
            return
        }

        let base64data = encodePassword(username);
        res.json({authdata: base64data})
        // res.json(utils.generateAccessToken(username));
    } catch (err) {
        console.log(err);
        res.status(409)
    }
});

const UNIQUE_CONSTRAINT_CODE = 23505;

function encodePassword(username, password) {
    let buff = new Buffer(username + ':' + password);
    return buff.toString('base64');
}

router.post('/signUp', async function (req, res, next) {
    const { username, password } = req.body;
    if (!utils.isset(username, password)) {
        res.status = 400;
        res.send("Bad request. username or password not setted");
        return
    }

    try {
        console.log(req.body);
        const rows = await pool.query("SELECT 1 as val");
        console.log(rows);
        try {
            const result = await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, crypt.encrypt(password)]);
            console.log(result);
            res.status(200);
            let base64data = encodePassword(username, password);
            res.send(base64data)
            // res.json({code: 0, message: "ok"})
            // res.json(utils.generateAccessToken(username));
        } catch (err) {
            if (err.code === UNIQUE_CONSTRAINT_CODE) {
                console.log(err);
                res.status(200);
                res.json({code:4, message: "user already exists"});
            } else {
                console.log(err);
                res.status(409);
                res.json({code: 1, message: "failed error"});
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500);
        res.json({code: 2, message: "internal error"});
    }
});

module.exports = router;