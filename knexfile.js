'use strict';

const config = require('./src/db').options;

const options = {
    ...config,
    migrations: {
        tableName: 'knex_migrations',
        directory: 'test/migrations'
    },
    seeds: {
        directory: 'test/seeds'
    }
};

module.exports = {
    development: options,
    test: options
};
