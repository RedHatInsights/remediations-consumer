import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';

describe('advisor handler integration tests', function () {
    test('update issue', async () => {
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

        const result = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ remediation_issue_id: '1'});

        result[0].resolved.should.equal(true);
        spy.callCount.should.equal(1);
    });

    test('update multiple issues', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074", "advisor:CVE_2017_6074_kernel|KERNEL_CVE_2019_6075"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateSuccess');

        await handler(message);

        const result1 = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ remediation_issue_id: '1'});

        const result2 = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' })
        .where({ remediation_issue_id: '6'});

        result1[0].resolved.should.equal(false);
        result2[0].resolved.should.equal(true);
        spy.callCount.should.equal(2);
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

        const spy = getSandbox().spy(probes, 'advisorUpdateUnknown');

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

        const spy = getSandbox().spy(probes, 'advisorUpdateUnknown');

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
        getSandbox().stub(db, 'findHostIssue').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (update)', async () => {
        const message = {
            topic: 'platform.remediation-updates.advisor',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa", "issues": ["advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'advisorUpdateError');
        getSandbox().stub(db, 'updateIssue').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
