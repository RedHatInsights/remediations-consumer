export function up (knex) {
    return knex.schema.alterTable('playbook_run_systems', function (table) {
        table.integer('connection_code').nullable().defaultTo(null);
        table.integer('execution_code').nullable().defaultTo(null);
    });
}

export function down (knex) {
    return knex.schema.alterTable('playbook_run_systems', function (table) {
        table.dropColumn('connection_code');
        table.dropColumn('execution_code');
    });
}
