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
});
