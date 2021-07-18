const userService = require('../users/usersService');

exports.basicAuth = async function basicAuth(req, res, next) {
    // make authenticate path public
    console.log(req.path);
    if (req.path === "/api/users/signUp" || req.path === "/api/users/signIn") {
        console.log('next');
        return next();
    }

    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        return res.status(401).json({ message: 'Missing Authorization Header' });
    }

    // verify auth credentials
    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    console.log(username);
    console.log(password);
    const user = await userService.authenticate({ username, password });
    if (!user) {
        return res.status(401).json({ message: 'Invalid Authentication Credentials' });
    }

    // attach user to request object
    req.user = user

    next();
}