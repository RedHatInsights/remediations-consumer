export function up (knex) {
    return knex.schema.createTable('remediation_issues', function (table) {
        table.increments('id').primary();
        table.string('issue_id').notNullable();
        table.uuid('remediation_id').notNullable();
        table.string('resolution');
    });
}

export function down (knex) {
    return knex.schema.dropTable('remediation_issues');
}
