import config from '../config';
import log from '../util/log';
import * as Knex from 'knex';
const dryRun = config.db.dryRun;

const opts = {
    client: 'pg',
    connection: config.db.connection,
    pool: { min: 2, max: 10 },
    asyncStackTraces: true,
    acquireConnectionTimeout: 10000
};

if (!opts.connection.ssl.ca) {
    delete opts.connection.ssl;
}

export const options = Object.freeze(opts);

let knex: any = null;

export function get (): Knex {
    if (knex === null) {
        throw new Error('not connected');
    }

    return knex;
}

export async function start (): Promise<Knex> {
    knex = Knex(opts);
    await knex.raw('SELECT 1 AS result');
    return knex;
}

export async function deleteSystem (system_id: string): Promise<number> {
    const query = get()('remediation_issue_systems').where({ system_id }).delete();
    const sql = query.toSQL().toNative();

    if (dryRun) {
        log.debug(sql, 'not executing database query (dry run)');
        return 0;
    }

    log.debug(sql, 'executing database query');
    return query;
}

export function stop () {
    if (knex !== null) {
        return knex.destroy();
    }
}
