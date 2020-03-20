export function up (knex) {
    return knex.schema.createTable('playbook_run_systems', function (table) {
        table.uuid('id').primary().notNullable();
        table.uuid('system_id').notNullable();
        table.string('system_name').notNullable();
        table.enum('status', ['pending', 'running', 'success', 'failure', 'canceled']).defaultTo('pending').notNullable();
        table.integer('sequence').notNullable().defaultTo(-1);
        table.string('console').notNullable();
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now(6));
        table.uuid('playbook_run_executor_id').notNullable();
        table.foreign('playbook_run_executor_id').references('playbook_run_executors.id');
    });
}

export function down (knex) {
    return knex.schema.dropTable('playbook_run_systems');
}
