/* eslint-disable max-len */

import { getSandbox } from '../../test';
import handler from './receptor';
import * as probes from '../probes';

describe('receptor handler integration tests', function () {
    test('prints message to receptor probe', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        const spy = getSandbox().spy(probes, 'receptorIncomingMessage');

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
