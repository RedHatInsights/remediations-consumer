export function up (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.unique('receptor_job_id', 'receptor_job_id');
    });
}

export function down (knex) {
    return knex.schema.alterTable('playbook_run_executors', function (table) {
        table.dropUnique('receptor_job_id', 'receptor_job_id');
    });
}
