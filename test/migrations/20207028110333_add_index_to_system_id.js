export function up (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.index('system_id');
    });
}

export function down (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.dropIndex('system_id');
    });
}
