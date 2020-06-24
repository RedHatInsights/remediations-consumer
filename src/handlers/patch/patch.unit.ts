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
});
