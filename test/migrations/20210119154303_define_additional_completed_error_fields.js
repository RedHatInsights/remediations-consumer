export function up (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.renameColumn('connection_code', 'satellite_connection_code');
        table.renameColumn('execution_code', 'satellite_infrastructure_code');
        table.string('satellite_connection_error').nullable().defaultTo(null);
        table.string('satellite_infrastructure_error').nullable().defaultTo(null);
    });
}

export function down (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.renameColumn('satellite_connection_code', 'connection_code');
        table.renameColumn('satellite_infrastructure_code', 'execution_code');
        table.dropColumn('satellite_connection_error');
        table.dropColumn('satellite_infrastructure_error');
    });
}
