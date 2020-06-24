/* eslint-disable max-len */

import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';
import config from '../../config';

describe('inventory handler integration tests', function () {
    test('removes system references', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'inventoryRemoveSuccess');

        await handler(message);
        const [{ count }] = await db.get()('remediation_issue_systems').where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96cc' }).count();
        parseInt(count).should.equal(0);
        spy.callCount.should.equal(1);
    });

    test('does nothing on unknown host', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "dde971ae-0a39-4c2b-9041-a92e2d5a96ab"}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'inventoryRemoveUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('handles database errors', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "028c2c96-ba6b-4361-ae2b-e812841b2a87"}',
            offset: 0,
            partition: 12,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'inventoryRemoveError');
        getSandbox().stub(db, 'deleteSystem').throws();

        await handler(message);
        spy.callCount.should.equal(1);
    });

    test('does not remove anything in dryRun', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "aa94b090-ea16-46ed-836d-5f42a918e9c7"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'inventoryRemoveSuccess');
        getSandbox().stub(config.db, 'dryRun').value(true);

        await handler(message);
        const [{ count }] = await db.get()('remediation_issue_systems').where({ system_id: 'aa94b090-ea16-46ed-836d-5f42a918e9c7' }).count();
        parseInt(count).should.equal(1);
        spy.callCount.should.equal(0);
    });
});
