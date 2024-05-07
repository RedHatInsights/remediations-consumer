'use strict';

const config = require('./dist/src/config').default.db;
const buildConfiguration = require('./dist/src/db').buildConfiguration;

const options = {
    ...buildConfiguration(config),
    migrations: {
        tableName: 'knex_migrations',
        directory: './dist/test/migrations'
    },
    seeds: {
        directory: './dist/test/seeds'
    }
};

module.exports = {
    development: options,
    test: options
};
