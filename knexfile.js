'use strict';

const config = require('./dist/src/db').options;

const options = {
    ...config,
    migrations: {
        tableName: 'knex_migrations',
        directory: 'dist/test/migrations'
    },
    seeds: {
        directory: 'dist/test/seeds'
    }
};

module.exports = {
    development: options,
    test: options
};
