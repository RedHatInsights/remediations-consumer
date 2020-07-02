import { RemediationIssueSystems, RemediationIssues } from '../models';
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

        const result = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ [RemediationIssues.issue_id]: 'patch:RHBA-2019:4105'});

        result[0].resolved.should.equal(true);
        spy.callCount.should.equal(2);
    });

    test('update multiple issues', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:4105"]}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateSuccess');

        await handler(message);

        const result1 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ [RemediationIssues.issue_id]: 'patch:RHBA-2019:4105'});

        const result2 = await db.get()(RemediationIssueSystems.TABLE)
        .join(RemediationIssues.TABLE, RemediationIssues.id, RemediationIssueSystems.remediation_issue_id)
        .where({ [RemediationIssueSystems.system_id]: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' })
        .where({ [RemediationIssues.issue_id]: 'patch:RHBA-2019:0689'});

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

        const spy = getSandbox().spy(probes, 'patchHostUnknown');

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

        const spy = getSandbox().spy(probes, 'patchIssueUnknown');

        await handler(message);
        spy.callCount.should.equal(2);
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
        getSandbox().stub(db, 'findHostIssues').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateUnresolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateError');
        getSandbox().stub(db, 'updateToUnresolved').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors (updateResolved)', async () => {
        const message = {
            topic: 'platform.remediation-updates.patch',
            value: '{"host_id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc", "issues": ["patch:RHBA-2019:0689"]}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'patchUpdateError');
        getSandbox().stub(db, 'updateToResolved').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
