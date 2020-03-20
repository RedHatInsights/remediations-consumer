/* eslint-disable max-len */

import handler from '.';

describe('receptor handler integration tests', function () {
    test('prints message to receptor probe', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });
});
