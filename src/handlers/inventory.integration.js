'use strict';
/* eslint-disable max-len */

const { getSandbox } = require('../../test');
const handler = require('./inventory');
const db = require('../db');
const probes = require('../probes');

describe('inventory handler integration tests', function () {
    test('removes system references', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "dde971ae-0a39-4c2b-9041-a92e2d5a96cc"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: null
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
            key: null
        };

        const spy = getSandbox().spy(probes, 'inventoryRemoveUnknown');

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
