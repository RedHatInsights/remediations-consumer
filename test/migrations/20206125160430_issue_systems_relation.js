export function up (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.foreign('remediation_issue_id').references('remediation_issues.id');
    });
}

export function down (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.dropForeign('remediation_issue_id');
    });
}
