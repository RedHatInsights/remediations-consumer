export function up (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.boolean('text_update_full').notNullable().defaultTo(true);
    });
}

export function down (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.dropColumn('text_update_full');
    });
}
