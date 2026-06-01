import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';

describe('patch handler unit tests', function () {
    let patchUpdateErrorParse: any = null;

    beforeEach(() => {
        patchUpdateErrorParse = getSandbox().spy(probes, 'patchUpdateErrorParse');
    });

    test('parses a message', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"], "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('throws error on missing field', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid JSON', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-904',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles empty issues array', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "47c686b1-c359-44a9-bd2f-1c111c0533db", "issues": []}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        // Empty issues array should be valid - parse error should NOT be called
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles RHEL module with plus sign in version', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:buildah-2:1.33.10-1.module+el8.10.0+22397+e3c95ba6.x86_64"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles 2839 issues (production example)', async () => {
        const issues = Array(2839).fill('patch:kernel-0:4.18.0-553.100.1.el8_10.x86_64');
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: JSON.stringify({
                host_id: '34ffef78-f014-493b-bab6-1228640cc608',
                issues
            }),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('handles exactly 50000 issues (at limit)', async () => {
        const issues = Array(50000).fill('patch:test-0:1.0-1.el8.x86_64');
        const message = {
            topic: 'platform.remediation-updates.patch',
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
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects 50001 issues (over limit)', async () => {
        const issues = Array(50001).fill('patch:test-0:1.0-1.el8.x86_64');
        const message = {
            topic: 'platform.remediation-updates.patch',
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
        patchUpdateErrorParse.callCount.should.equal(1);
    });

    test('handles issue ID with exactly 500 characters', async () => {
        const longIssue = 'patch:' + 'x'.repeat(494);
        const message = {
            topic: 'platform.remediation-updates.patch',
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
        patchUpdateErrorParse.callCount.should.equal(0);
    });

    test('rejects issue ID with 501 characters', async () => {
        const tooLongIssue = 'patch:' + 'x'.repeat(495);
        const message = {
            topic: 'platform.remediation-updates.patch',
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
        patchUpdateErrorParse.callCount.should.equal(1);
    });

    test('rejects UUID v1 format', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "issues": ["patch:test-1.0"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        patchUpdateErrorParse.callCount.should.equal(1);
    });
});
