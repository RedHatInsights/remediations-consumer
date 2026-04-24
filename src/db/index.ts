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
    const knex = get();

    if (dryRun) {
        // Count how many rows would be affected in both tables
        const [issueSystemsResult, systemsResult] = await Promise.all([
            knex('remediation_issue_systems').where({ system_id }).count(),
            knex('systems').where({ id: system_id }).count()
        ]);

        const issueSystemsCount = typeof issueSystemsResult[0].count === 'number'
            ? issueSystemsResult[0].count
            : parseInt(issueSystemsResult[0].count as string);
        const systemsCount = typeof systemsResult[0].count === 'number'
            ? systemsResult[0].count
            : parseInt(systemsResult[0].count as string);

        return issueSystemsCount + systemsCount;
    }

    let issueSystemsCount = 0;
    let systemsCount = 0;

    try {
        issueSystemsCount = await knex('remediation_issue_systems').where({ system_id }).delete();
    } catch (e) {
        if (e instanceof Error) {
            log.warn({ system_id, error: e }, 'Failed to delete from remediation_issue_systems');
        }
    }

    try {
        systemsCount = await knex('systems').where({ id: system_id }).delete();
    } catch (e) {
        if (e instanceof Error) {
            log.warn({ system_id, error: e }, 'Failed to delete from systems table');
        }
    }

    return issueSystemsCount + systemsCount;
}

export async function findHostIssues (knex: Knex, host_id: string) {
    return knex(RemediationIssues.TABLE)
    .select(RemediationIssues.issue_id)
    .join(RemediationIssueSystems.TABLE, RemediationIssueSystems.remediation_issue_id, RemediationIssues.id)
    .where(RemediationIssueSystems.system_id, EQ, host_id);
}

/**
 * Validates issue_id format to prevent SQL injection and malformed data
 *
 * Valid formats based on seed data:
 * - advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074
 * - ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled
 * - patch:RHBA-2019:0689
 * - vulnerabilities:CVE-2018-5716
 *
 * @param issueId The issue ID to validate
 * @returns true if valid, false otherwise
 */
function validateIssueId(issueId: string): boolean {
    // Allow only safe characters: alphanumeric, hyphens, underscores,
    // pipes, colons, dots - no SQL special characters
    const ISSUE_ID_PATTERN = /^[a-zA-Z0-9_:|.\-\s]+$/;

    // Prevent DoS from excessively long strings
    const MAX_ISSUE_ID_LENGTH = 500;

    // Type and emptiness checks
    if (typeof issueId !== 'string' || issueId.length === 0) {
        return false;
    }

    // Length check
    if (issueId.length > MAX_ISSUE_ID_LENGTH) {
        log.warn({ issueId: issueId.substring(0, 100) + '...' }, 'Issue ID exceeds maximum length');
        return false;
    }

    // Pattern check - blocks all SQL special characters
    if (!ISSUE_ID_PATTERN.test(issueId)) {
        log.warn({ issueId }, 'Issue ID contains invalid characters');
        return false;
    }

    // Block SQL comment markers specifically
    if (issueId.includes('--') || issueId.includes('/*') || issueId.includes('*/')) {
        log.warn({ issueId }, 'Issue ID contains SQL comment markers');
        return false;
    }

    return true;
}

export async function updateIssues (knex: Knex, host_id: string, issues: string[], prefix: string) {
    // Validate all issue IDs before processing
    const invalidIssues = issues.filter(issue => !validateIssueId(issue));
    if (invalidIssues.length > 0) {
        log.warn({ invalidIssues, host_id }, 'Rejecting update due to invalid issue IDs');
        throw new Error(`Invalid issue IDs detected: ${invalidIssues.join(', ')}`);
    }

    // Create individual placeholders for each issue
    const placeholders = issues.length > 0
        ? issues.map(() => '?').join(',')
        : '';

    const notInClause = issues.length > 0
        ? `remediation_issues.issue_id NOT IN (${placeholders})`
        : 'TRUE';

    // Each issue gets its own parameter - proper parameterization
    return knex.raw(
        `UPDATE remediation_issue_systems
         SET resolved = ${notInClause}
         FROM remediation_issues
         WHERE remediation_issues.id = remediation_issue_systems.remediation_issue_id
         AND remediation_issues.issue_id LIKE ?
         AND remediation_issue_systems.system_id = ?`,
        [...issues, prefix, host_id]
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

/**
 * Updates an existing system record
 *
 * Only updates systems that already exist in the table (part of remediation plans)
 * This function is used by the inventory consumer to update system details when
 * inventory sends update events for systems we're tracking
 */
export async function updateSystem(
    knex: Knex,
    id: string,
    hostname?: string,
    display_name?: string,
    ansible_hostname?: string
) {
    const now = new Date();

    // Only update fields that are explicitly provided (undefined fields are ignored)
    // This preserves existing data if inventory sends partial updates
    const updateFields: any = { updated_at: now };
    if (hostname) {updateFields.hostname = hostname;}

    if (display_name) {updateFields.display_name = display_name;}

    if (ansible_hostname) {updateFields.ansible_hostname = ansible_hostname;}

    await knex('systems')
    .where({ id })
    .update(updateFields);
}

export function stop () {
    if (knex !== null) {
        return knexInstance.destroy();
    }
}
