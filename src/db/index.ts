import log from '../util/log';
import * as Knex from 'knex';

interface DbConfig {
    connection:
        Record<'user' | 'password' | 'database'| 'host', string> &
        Record<'port', number> &
        Record<'ssl', Record<'ca', string | undefined>>;
    ssl: Record<'enabled', boolean>;
    pool: Record<'min' | 'max', number>;
}

export function buildConfiguration (config: DbConfig) {
    const opts = {
        client: 'pg',
        connection: config.connection,
        pool: config.pool,
        asyncStackTraces: true,
        acquireConnectionTimeout: 10000
    };

    if (!config.ssl.enabled || !opts.connection.ssl.ca) {
        delete opts.connection.ssl;
    }

    return Object.freeze(opts);
}

let knex: any = null;

export function get (): Knex {
    if (knex === null) {
        throw new Error('not connected');
    }

    return knex;
}

export async function start (config: DbConfig): Promise<Knex> {
    knex = Knex(buildConfiguration(config));
    await knex.raw('SELECT 1 AS result');
    knex.on('query', (data: any) => log.trace({sql: data.sql, bindings: data.bindings}, 'executing SQL query'));
    return knex;
}

export async function deleteSystem (system_id: string, dryRun = false): Promise<number> {
    const base = get()('remediation_issue_systems').where({ system_id });

    if (dryRun) {
        const query = base.count();
        const sql = query.toSQL().toNative();
        log.debug({ sql }, 'executing database query');
        const result = (await query)[0].count;
        if (typeof result === 'number') {
            return result;
        }

        return parseInt(result);
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
