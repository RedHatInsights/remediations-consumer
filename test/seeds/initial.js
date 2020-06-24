const toSchema = ({issue, system}) => ({ remediation_issue_id: issue, system_id: system});

export async function seed (knex) {
    await knex('remediation_issue_systems').del();
    await knex('remediation_issues').del();

    await knex('remediation_issues').insert([{
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'patch:RHBA-2019:0689'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'vulnerabilities:CVE-2018-5716'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'vulnerabilities:CVE-2019-5717'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2019_6075'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_rsylog_enabled'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'patch:RHBA-2019:4105'
    }, {
        remediation_id: '1f12bdfc-8267-492d-a930-92f498fe65b9',
        issue_id: 'vulnerabilities:CVE-2020-5719'
    }]);
    await knex('remediation_issue_systems').insert([
        { issue: 1, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa', resolved: false },
        { issue: 2, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb', resolved: false },
        { issue: 3, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc', resolved: false },
        { issue: 4, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96dd', resolved: false },
        { issue: 5, system: 'aa94b090-ea16-46ed-836d-5f42a918e9c7', resolved: false },
        { issue: 6, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa', resolved: false },
        { issue: 7, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb', resolved: false },
        { issue: 8, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc', resolved: false },
        { issue: 9, system: 'dde971ae-0a39-4c2b-9041-a92e2d5a96dd', resolved: false }
    ].map(toSchema));
}
