export async function seed (knex) {
    await knex('playbook_runs').del();

    await knex('playbook_runs').insert([{
        id: '88d0ba73-0015-4e7d-a6d6-4b530cbfb5bc',
        status: 'running',
        remediation_id: '147b453d-36be-4c72-8dff-f1d24587ff71',
        created_by: 'fifi',
        created_at: '2019-12-23T08:19:36.641Z',
        updated_at: '2019-12-23T08:19:36.641Z'
    }, {
        id: '88d0ba73-0015-4e7d-a6d6-4b530cbfb6bc',
        status: 'running',
        remediation_id: '147b453d-36be-4c72-8dff-f1d24587ff72',
        created_by: 'fifi',
        created_at: '2019-12-23T08:19:36.641Z',
        updated_at: '2019-12-23T08:19:36.641Z'
    }, {
        id: '99d0ba73-0015-4e7d-a6d6-4b530cbfb6cb',
        status: 'running',
        remediation_id: '147b453d-36be-4c72-8dff-f1d24587ff73',
        created_by: 'fifi',
        created_at: '2019-12-23T08:19:36.641Z',
        updated_at: '2019-12-23T08:19:36.641Z'
    }]);
}
