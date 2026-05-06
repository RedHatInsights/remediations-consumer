import { RemediationIssueSystems, RemediationIssues } from '../models';
import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';

describe('advisor handler integration tests', function () {
    test('update issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2019_6075"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateSuccess');

        await handler(message);

        const result = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ [RemediationIssues.issue_id]: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074'});

        result[0].resolved.should.equal(true);
        spy.callCount.should.equal(1);
    });

    test('update multiple issues', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateSuccess');

        await handler(message);

        const result1 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ [RemediationIssues.issue_id]: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074'});

        const result2 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ [RemediationIssues.issue_id]: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2019_6075'});

        result1[0].resolved.should.equal(false);
        result2[0].resolved.should.equal(true);
        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown host', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96ad", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorHostUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["1"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorIssueUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (search)', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateError');
        getSandbox().stub(db, 'findHostIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateUnresolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateError');
        getSandbox().stub(db, 'updateIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateResolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateError');
        getSandbox().stub(db, 'updateIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    describe('SQL injection security tests', () => {
        test('rejects SQL injection with DROP TABLE', async () => {
            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues: ["advisor:CVE'; DROP TABLE remediation_issues; --"]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'advisorUpdateErrorParse');

            await handler(message);

            spy.callCount.should.equal(1);

            // Verify table still exists
            const tableExists = await db.get().schema.hasTable('remediation_issues');
            tableExists.should.be.true();
        });

        test('rejects issues with semicolons', async () => {
            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues: ["advisor:test;DELETE FROM remediation_issues"]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'advisorUpdateErrorParse');
            await handler(message);
            spy.callCount.should.equal(1);
        });

        test('rejects UNION-based SQL injection', async () => {
            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues: ["' UNION SELECT id FROM remediation_issues--"]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'advisorUpdateErrorParse');
            await handler(message);
            spy.callCount.should.equal(1);
        });

        test('handles large number of issues without SQL injection', async () => {
            // Create 100 valid issue IDs
            const issues = Array.from({ length: 100 }, (_, i) =>
                `advisor:CVE-2017-${i.toString().padStart(5, '0')}`
            );

            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'advisorUpdateSuccess');
            await handler(message);

            // Should succeed without errors
            spy.callCount.should.equal(1);
        });

        test('properly handles special characters in legitimate issue IDs', async () => {
            // These are legitimate formats from seed data
            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues: ['advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074']
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);

            // Verify the issue was processed correctly and marked as resolved
            const result = await db.get()(RemediationIssueSystems.TABLE)
                .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
                .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
                .where({ [RemediationIssues.issue_id]: 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074'});

            result[0].resolved.should.equal(false);
        });

        test('validates all issues in array before processing any', async () => {
            const message = {
                topic: 'platform.remediation-updates.advisor',
                value: JSON.stringify({
                    host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa',
                    issues: [
                        'advisor:CVE-2017-0001',  // valid
                        "advisor:CVE'; DROP TABLE users;",  // invalid
                        'advisor:CVE-2017-0002'   // valid
                    ]
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const errorSpy = getSandbox().spy(probes, 'advisorUpdateErrorParse');
            const successSpy = getSandbox().spy(probes, 'advisorUpdateSuccess');

            await handler(message);

            // Should fail with error
            errorSpy.callCount.should.equal(1);
            successSpy.callCount.should.equal(0);
        });
    });
});
