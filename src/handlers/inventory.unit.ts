/* eslint-disable max-len */

import '../../test';
import handler from './inventory';

describe('inventory handler unit tests', function () {
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
    });

    test('throws error on missing field', async () => {
        const message = {
            topic: 'platform.inventory.events',
            value: '{"timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });
});
