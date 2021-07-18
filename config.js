const env = process.env;
const pg = require('pg');
pg.defaults.ssl = true;

exports.getDbPool = () => {
    return new pg.Pool({
        host: env.DB_HOST || 'localhost',
        port: env.DB_PORT || '5432',
        user: env.DB_USER || 'postgres',
        password: env.DB_PASSWORD || 'postgres',
        database: env.DB_NAME || 'wildberries',
        ssl: {
            rejectUnauthorized: false
        }
    })
};