/* eslint-disable max-len */

import { getSandbox } from '../../test';
import handler from './receptor';
import * as probes from '../probes';

const validAck = JSON.stringify({
    type: 'playbook_run_ack',
    playbook_run_id: '4b407690-e2f8-4563-96a6-6191f1df8901'
});

const validUpdate = JSON.stringify({
    type: 'playbook_run_update',
    playbook_run_id: '4b407690-e2f8-4563-96a6-6191f1df8901',
    sequence: 0,
    host: '01.example.com',
    console: 'console text output'
});

const validFinished = JSON.stringify({
    type: 'playbook_run_finished',
    playbook_run_id: '4b407690-e2f8-4563-96a6-6191f1df8901',
    host: '01.example.com',
    status: 'success'
});

const validCancel = JSON.stringify({
    type: 'playbook_run_cancel_ack',
    playbook_run_id: '4b407690-e2f8-4563-96a6-6191f1df8901'
});

function createInvalidPayload (type: string): any {
    return JSON.stringify({ type });
}

describe('receptor handler unit tests', function () {

    let receptorErrorParse: any = null;

    beforeEach(() => {
        receptorErrorParse = getSandbox().spy(probes, 'receptorErrorParse');
    });

    test('parses ack message', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses update message', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validUpdate}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses finished message', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validFinished}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses cancel message', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validCancel}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}", "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('throws error on invalid ack payload', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${createInvalidPayload('playbook_run_ack')}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid update payload', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${createInvalidPayload('playbook_run_update')}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid finished payload', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${createInvalidPayload('playbook_run_finished')}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid cancel payload', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${createInvalidPayload('playbook_run_cancel_ack')}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (1)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (2)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (3)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_type": "update", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (4)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_type": "update", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (5)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "payload": ${validAck}}`,
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on missing field (6)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: '{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid JSON', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: '{"sender": "fifi',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });
});
