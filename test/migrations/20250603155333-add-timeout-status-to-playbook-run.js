export async function up(knex) {
    await knex.raw(`ALTER TYPE "enum_playbook_runs_status" ADD VALUE IF NOT EXISTS 'timeout'`);
    await knex.raw(`ALTER TYPE "enum_playbook_run_executors_status" ADD VALUE IF NOT EXISTS 'timeout'`);
    await knex.raw(`ALTER TYPE "enum_playbook_run_systems_status" ADD VALUE IF NOT EXISTS 'timeout'`);
}

export async function down(knex) {
    // Enum value removals are not supported in PostgreSQL
    console.warn('Down migration not supported for ENUM modifications');
}
