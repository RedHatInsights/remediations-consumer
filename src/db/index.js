'use strict';

const config = require('../config');

const options = {
    client: 'pg',
    connection: config.get('db.connection'),
    pool: { min: 2, max: 10 },
    asyncStackTraces: true,
    acquireConnectionTimeout: 10000
};

if (!options.connection.ssl.ca) {
    delete options.connection.ssl;
}

exports.options = Object.freeze(options);

let knex = null;

exports.get = function () {
    if (knex === null) {
        throw new Error('not connected');
    }

    return knex;
};

exports.start = async function () {
    knex = require('knex')(options);
    await knex.raw('SELECT 1 AS result');
    return knex;
};

exports.deleteSystem = async function (system_id) {
    return exports.get()('remediation_issue_systems').where({ system_id }).delete();
};

exports.stop = function () {
    return knex.destroy();
};
