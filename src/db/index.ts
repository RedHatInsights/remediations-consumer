import log from '../util/log';
import { knex, Knex } from 'knex';
import { RemediationIssues, RemediationIssueSystems } from '../handlers/models';

const EQ = '=';

interface DbConfig {
    connection:
        Record<'user' | 'password' | 'database'| 'host', string> &
        Record<'port', number> &
        Partial<Record<'ssl', Record<'ca', string | undefined>>>;
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

    if (!config.ssl.enabled || !opts.connection.ssl?.ca) {
        delete opts.connection.ssl;
    }

    return Object.freeze(opts);
}

let knexInstance: any = null;

export function get (): Knex {
    if (knexInstance === null) {
        throw new Error('not connected');
    }

    return knexInstance;
}

export async function start (config: DbConfig): Promise<Knex> {
    knexInstance = knex(buildConfiguration(config));
    await knexInstance.raw('SELECT 1 AS result');
    knexInstance.on('query', (data: any) => log.trace({sql: data.sql, bindings: data.bindings}, 'executing SQL query'));
    return knexInstance;
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

export async function updateIssues (knex: Knex, host_id: string, issues: string[], prefix: string) {
    return knex.raw(
        `UPDATE remediation_issue_systems SET resolved = remediation_issues.issue_id ` +
        'NOT IN (?) ' +
        `FROM remediation_issues ` +
        `WHERE remediation_issues.id = remediation_issue_systems.remediation_issue_id ` +
        'AND remediation_issues.issue_id LIKE ? ' +
        `AND remediation_issue_systems.system_id = ?`,
        [issues.join(','), prefix, host_id]
    );
}

/**
 * Inserts or updates a dispatcher run record
 *
 * If no record with the given dispatcher_run_id exists, a new one is inserted with the
 * provided status and remediations_run_id
 *
 * If a record already exists, only the status and updated_at fields are updated
 * The remediations_run_id and created_at fields are left unchanged for existing records
 *
 * This handles both 'create' and 'update' events from playbook-dispatcher Kafka messages
 */
export async function createOrUpdateDispatcherRun(
    knex: Knex,
    dispatcher_run_id: string,
    status: string,
    remediations_run_id: string
) {
    const now = new Date();

    await knex('dispatcher_runs')
        .insert({
            dispatcher_run_id,
            status,
            remediations_run_id,
            created_at: now,
            updated_at: now
        })
        .onConflict('dispatcher_run_id')
        .merge({
            status,
            updated_at: now
        });
}

export function stop () {
    if (knex !== null) {
        return knexInstance.destroy();
    }
}
