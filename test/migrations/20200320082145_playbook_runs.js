export function up (knex) {
    return knex.schema.createTable('playbook_runs', function (table) {
        table.uuid('id').primary().notNullable();
        table.enum('status', [
            'pending',
            'acked',
            'running',
            'success',
            'failure',
            'canceled']).defaultTo('pending').notNullable();
        table.uuid('remediation_id').notNullable();
        table.string('created_by').notNullable();
        table.datetime('created_at').notNullable().defaultTo(knex.fn.now(6));
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now(6));
    });
}

export function down (knex) {
    return knex.schema.dropTable('playbook_runs');
}
