export function up (knex) {
    return knex.schema.alterTable('playbook_run_systems', function (table) {
        table.index('system_name');
    });
}

export function down (knex) {
    return knex.schema.alterTable('playbook_run_systems', function (table) {
        table.dropIndex('system_name');
    });
}
