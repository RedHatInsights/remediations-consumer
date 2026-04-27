import { RemediationIssueSystems, RemediationIssues } from '../models';
import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';

describe('compliance handler integration tests', function () {
    test('update issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceUpdateSuccess');

        await handler(message);

        const result = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb' })
        .where({ [RemediationIssues.issue_id]: 'ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_rsylog_enabled'});

        result[0].resolved.should.equal(true);
        spy.callCount.should.equal(1);
    });

    test('update multiple issues', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_rsylog_enabled"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceUpdateSuccess');

        await handler(message);

        const result1 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb' })
        .where({ [RemediationIssues.issue_id]: 'ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_rsylog_enabled'});


        const result2 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb' })
        .where({ [RemediationIssues.issue_id]: 'ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled'});


        result1[0].resolved.should.equal(false);
        result2[0].resolved.should.equal(true);

        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown host', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96ad", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceHostUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["1"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceIssueUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (search)', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceUpdateError');
        getSandbox().stub(db, 'findHostIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateUnresolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceUpdateError');
        getSandbox().stub(db, 'updateIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateResolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96bb", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'complianceUpdateError');
        getSandbox().stub(db, 'updateIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    describe('SQL injection security tests', () => {
        test('rejects SQL injection with DROP TABLE', async () => {
            const message = {
                topic: 'platform.remediation-updates.compliance',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb',
                    issues: ["ssg:rhel7'; DROP TABLE remediation_issues; --"]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'complianceUpdateErrorParse');
            await handler(message);
            spy.callCount.should.equal(1);

            const tableExists = await db.get().schema.hasTable('remediation_issues');
            tableExists.should.be.true();
        });

        test('rejects issues with single quotes', async () => {
            const message = {
                topic: 'platform.remediation-updates.compliance',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb',
                    issues: ["ssg:test'malicious"]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'complianceUpdateErrorParse');
            await handler(message);
            spy.callCount.should.equal(1);
        });

        test('handles large number of valid issues', async () => {
            const issues = Array.from({ length: 50 }, (_, i) =>
                `ssg:rhel7|standard|rule_${i.toString().padStart(5, '0')}`
            );

            const message = {
                topic: 'platform.remediation-updates.compliance',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb',
                    issues
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'complianceUpdateSuccess');
            await handler(message);
            spy.callCount.should.equal(1);
        });
    });
});
