module.exports = {
    authenticate,
};

const Cryptr = require('cryptr');
const crypt = new Cryptr("qwerty");
const config = require('../../config');
const pool = config.getDbPool();
const utils = require('../../utils/utils');

async function authenticate({username, password}) {
   try {
       const result = await pool.query('SELECT * FROM users WHERE username = $1;', [username]);

       // const cryptedPassword = crypt.decrypt(password);
       console.log('cryptedPassword');
       // console.log(cryptedPassword);
       console.log('result[0].password');
       let user = result.rows[0];
       console.log(user.password);
       let ok = user.length !== 0 && utils.checkPassword(crypt, password, user.password);
       if (ok) {
           return user;
       }
   } catch (e) {
       console.log(e);
       return  false;
   }
}