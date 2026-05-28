import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';

describe('advisor handler unit tests', function () {
    let advisorUpdateErrorParse: any = null;

    beforeEach(() => {
        advisorUpdateErrorParse = getSandbox().spy(probes, 'advisorUpdateErrorParse');
    });

    test('parses a message', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"], "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('throws error on missing field', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid JSON', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-904',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles empty issues array', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "47c686b1-c359-44a9-bd2f-1c111c0533db", "issues": []}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        // Empty issues array should be valid - parse error should NOT be called
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles advisor issue with plus sign', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["advisor:CVE+2017+6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles large number of issues', async () => {
        const issues = Array(2839).fill('advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074');
        const message = {
            topic: 'platform.remediation-updates.advisor',
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
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles exactly 50000 issues (at limit)', async () => {
        const issues = Array(50000).fill('advisor:test-issue');
        const message = {
            topic: 'platform.remediation-updates.advisor',
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
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects 50001 issues (over limit)', async () => {
        const issues = Array(50001).fill('advisor:test-issue');
        const message = {
            topic: 'platform.remediation-updates.advisor',
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
        advisorUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles issue ID with exactly 500 characters', async () => {
        const longIssue = 'advisor:' + 'x'.repeat(492);
        const message = {
            topic: 'platform.remediation-updates.advisor',
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
        advisorUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects issue ID with 501 characters', async () => {
        const tooLongIssue = 'advisor:' + 'x'.repeat(493);
        const message = {
            topic: 'platform.remediation-updates.advisor',
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
        advisorUpdateErrorParse.callCount.should.equal(1);
    });

    test('rejects UUID v1 format', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "issues": ["advisor:test-issue"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        advisorUpdateErrorParse.callCount.should.equal(1);
    });
});
