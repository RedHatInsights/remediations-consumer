import config from '../config';
import log from '../util/log';
import * as Knex from 'knex';

const opts = {
    client: 'pg',
    connection: config.db.connection,
    pool: config.db.pool,
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

export async function deleteSystem (system_id: string, dryRun = false): Promise<number> {
    const base = get()('remediation_issue_systems').where({ system_id });

    if (dryRun) {
        const query = base.count();
        const sql = query.toSQL().toNative();
        log.debug({ sql }, 'executing database query');
        return parseInt((await query)[0].count);
    }

    const query = base.delete();
    const sql = query.toSQL().toNative();
    log.debug({ sql }, 'executing database query');
    return query;
}

export function stop () {
    if (knex !== null) {
        return knex.destroy();
    }
}
