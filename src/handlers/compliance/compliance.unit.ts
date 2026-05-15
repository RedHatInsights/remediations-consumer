import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';

describe('compliance handler unit tests', function () {
    let complianceUpdateErrorParse: any = null;

    beforeEach(() => {
        complianceUpdateErrorParse = getSandbox().spy(probes, 'complianceUpdateErrorParse');
    });

    test('parses a message', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled"], "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('throws error on missing field', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid JSON', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-904',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles empty issues array', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "47c686b1-c359-44a9-bd2f-1c111c0533db", "issues": []}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        // Empty issues array should be valid - parse error should NOT be called
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles compliance issue with plus sign', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["ssg:rhel8+profile+standard|xccdf_org.ssgproject.content_rule_test"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles large number of issues', async () => {
        const issues = Array(2839).fill('ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled');
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc',
                issues
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles exactly 5000 issues (at limit)', async () => {
        const issues = Array(5000).fill('ssg:test-issue');
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc',
                issues
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects 5001 issues (over limit)', async () => {
        const issues = Array(5001).fill('ssg:test-issue');
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc',
                issues
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles issue ID with exactly 500 characters', async () => {
        const longIssue = 'ssg:' + 'x'.repeat(496);
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc',
                issues: [longIssue]
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects issue ID with 501 characters', async () => {
        const tooLongIssue = 'ssg:' + 'x'.repeat(497);
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc',
                issues: [tooLongIssue]
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(1);
    });

    test('rejects UUID v1 format', async () => {
        const message = {
            topic: 'platform.remediation-updates.compliance',
            value: '{"host_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "issues": ["ssg:test-issue"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        complianceUpdateErrorParse.callCount.should.equal(1);
    });
});
