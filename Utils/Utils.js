const jwt = require('jsonwebtoken');

exports.isset = (...arguments) => {
    for (const value of arguments) {
        if (value == null || value.length === 0) {
            return false;
        }
    }
    return true;
}

exports.generateAccessToken = (username) => {
    return jwt.sign({ username: username }, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token === null) {
        return res.sendStatus(401);
    }
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        console.log(err)

        if (err) {
            return res.sendStatus(403)
        }

        req.user = user
        next()
    })
}

exports.checkPassword = (crypt, password, originPassword) => {
    const userPassword = crypt.decrypt(originPassword);
    return (password !== userPassword);
}