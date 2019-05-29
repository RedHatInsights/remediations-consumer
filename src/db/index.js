'use strict';

const config = require('../config');
const dryRun = require('../config').get('db').dryRun;
const log = require('../util/log');

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
    const query = exports.get()('remediation_issue_systems').where({ system_id }).delete();
    const sql = query.toSQL().toNative();

    if (dryRun) {
        log.debug(sql, 'not executing database query (dry run)');
        return;
    }

    log.debug(sql, 'executing database query');
    return query;
};

exports.stop = function () {
    return knex.destroy();
};
