export function up (knex) {
    return knex.schema.createTable('remediation_issue_systems', function (table) {
        table.integer('remediation_issue_id');
        table.uuid('system_id');
        table.primary(['remediation_issue_id', 'system_id']);
    });
}

export function down (knex) {
    return knex.schema.dropTable('remediation_issue_systems');
}
