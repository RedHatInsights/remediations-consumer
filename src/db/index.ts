import log from '../util/log';
import * as Knex from 'knex';
import * as _ from 'lodash';
import { RemediationIssues, RemediationIssueSystems } from '../handlers/models';

const EQ = '=';

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

export async function findHostIssues (knex: Knex, host_id: string) {
    return knex(RemediationIssues.TABLE)
    .select(RemediationIssues.issue_id)
    .join(RemediationIssueSystems.TABLE, RemediationIssueSystems.remediation_issue_id, RemediationIssues.id)
    .where(RemediationIssueSystems.system_id, EQ, host_id);
}

function createUpdateQuery (host_id: string, issues: string[]) {
    const formatedIssues = `'` + _.join(issues, `', '`) + `'`;
    const updateQuery = `UPDATE remediation_issue_systems SET resolved = remediation_issues.issue_id ` +
    `NOT IN (${formatedIssues}) ` +
    `FROM remediation_issues ` +
    `WHERE remediation_issues.id = remediation_issue_systems.remediation_issue_id ` +
    `AND remediation_issue_systems.system_id = '${host_id}'`;

    return updateQuery;
}

export async function updateIssues (knex: Knex, host_id: string, issues: string[]) {
    const query = createUpdateQuery(host_id, issues);

    return knex.raw(query);
}

export function stop () {
    if (knex !== null) {
        return knex.destroy();
    }
}
