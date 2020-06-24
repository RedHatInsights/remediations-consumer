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
});
