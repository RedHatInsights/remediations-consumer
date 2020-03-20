export function up (knex) {
    return knex.schema.createTable('playbook_run_executors', function (table) {
        table.uuid('id').primary().notNullable();
        table.uuid('executor_id').notNullable();
        table.string('executor_name').notNullable();
        table.string('receptor_node_id').notNullable();
        table.uuid('receptor_job_id').notNullable();
        table.enum('status', [
            'pending',
            'acked',
            'running',
            'success',
            'failure',
            'canceled']).defaultTo('pending').notNullable();
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now(6));
        table.text('playbook').notNullable();
        table.uuid('playbook_run_id').notNullable();
        table.foreign('playbook_run_id').references('playbook_runs.id');
    });
}

export function down (knex) {
    return knex.schema.dropTable('playbook_run_executors');
}
