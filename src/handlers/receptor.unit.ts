/* eslint-disable max-len */

import { getSandbox } from '../../test';
import handler from './receptor';
import * as probes from '../probes';

describe('receptor handler unit tests', function () {
    test('parses a message', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}", "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (1)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (2)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (3)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (4)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_type": "update", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (5)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "payload": "{}"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on missing field (6)', async () => {
        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
    });

    test('throws error on invalid JSON', async () => {
        const spy = getSandbox().spy(probes, 'receptorUpdateErrorParse');

        const message = {
            topic: 'platform.receptor-controller.jobs',
            value: '{"sender": "fifi',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        spy.callCount.should.equal(1);
    });
});
