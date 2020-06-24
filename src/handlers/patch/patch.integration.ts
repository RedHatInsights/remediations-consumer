import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';

describe('patch handler integration tests', function () {
    test('update issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateSuccess');

        await handler(message);

        const result = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ remediation_issue_id: '3'});

        result[0].resolved.should.equal(true);
        spy.callCount.should.equal(1);
    });

    test('update multiple issues', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689", "patch:RHBA-2019:4105"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateSuccess');

        await handler(message);

        const result1 = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ remediation_issue_id: '3'});

        const result2 = await db.get()('remediation_issue_systems')
        .where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ remediation_issue_id: '8'});

        result1[0].resolved.should.equal(false);
        result2[0].resolved.should.equal(true);
        spy.callCount.should.equal(2);
    });

    test('does nothing on unknown host', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96ad", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown issue', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["1"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (search)', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateError');
        getSandbox().stub(db, 'findHostIssue').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (update)', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateError');
        getSandbox().stub(db, 'updateIssue').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
