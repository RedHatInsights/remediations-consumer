const toSchema = ({issue, system}) => ({ remediation_issue_id: issue, system_id: system});

export async function seed (knex) {
    await knex('remediation_issue_systems').del();
    await knex('remediation_issue_systems').insert([
        { issue: 1, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc', resolved: false },
        { issue: 2, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc', resolved: false },
        { issue: 3, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc', resolved: false },
        { issue: 4, system: 'aa94b090-ea16-46ed-836d-5f42a918e9c7', resolved: false }
    ].map(toSchema));
}
