export function up (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.boolean('resolved').notNullable().defaultTo(false);
    });
}

export function down (knex) {
    return knex.schema.alterTable('remediation_issue_systems', function (table) {
        table.dropColumn('resolved');
    });
}
