/* eslint-disable max-len */

import { getSandbox } from '../../test';
import handler from './inventory';
import * as probes from '../probes';

describe('inventory handler unit tests', function () {
    let inventoryRemoveErrorParse: any = null;

    beforeEach(() => {
        inventoryRemoveErrorParse = getSandbox().spy(probes, 'inventoryRemoveErrorParse');
    });

    test('parses a message', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        inventoryRemoveErrorParse.callCount.should.equal(0);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        inventoryRemoveErrorParse.callCount.should.equal(0);
    });

    test('throws error on missing field', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        inventoryRemoveErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid JSON', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"timestamp": "2019',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        inventoryRemoveErrorParse.callCount.should.equal(1);
    });
});
