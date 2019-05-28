'use strict';

const db = require('../src/db');

async function run () {
    const knex = await db.start();
    try {
        await knex.raw('DROP DATABASE IF EXISTS remediations_consumer_test');
        await knex.raw('CREATE DATABASE remediations_consumer_test');
    } finally {
        db.stop();
    }
}

run();
