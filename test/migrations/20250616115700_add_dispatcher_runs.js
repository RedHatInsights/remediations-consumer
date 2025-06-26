export function up(knex) {
    return knex.schema.createTable('dispatcher_runs', function (table) {
        table.uuid('dispatcher_run_id').primary().notNullable();
        table.uuid('remediations_run_id').notNullable()
            .references('id')
            .inTable('playbook_runs')
            .onDelete('CASCADE')
            .onUpdate('CASCADE');

        table.enum('status', [
            'pending',
            'running',
            'success',
            'failure',
            'canceled',
            'timeout'
        ], {
            useNative: true,
            enumName: 'enum_dispatcher_runs_status'
        }).defaultTo('pending').notNullable();

        table.datetime('created_at').notNullable().defaultTo(knex.fn.now(6));
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now(6));
    });
}

export function down(knex) {
    return knex.schema.dropTable('dispatcher_runs')
        .raw('DROP TYPE IF EXISTS enum_dispatcher_runs_status');
}
