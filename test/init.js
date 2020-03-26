import * as config from '../src/config';
import * as db from '../src/db';

async function run () {
    const knex = await db.start(config.default.db);
    try {
        await knex.raw('DROP DATABASE IF EXISTS remediations_consumer_test');
        await knex.raw('CREATE DATABASE remediations_consumer_test');
    } finally {
        db.stop();
    }
}

run();
