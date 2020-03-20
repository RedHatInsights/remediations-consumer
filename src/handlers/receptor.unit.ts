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

function createInvalidPayload (type: string): string {
    return JSON.stringify({ type });
}

function envelope(payload: string) {
    return `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "response", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${payload}}`;
}

function kafkaMessage (value: string) {
    return {
        topic: 'platform.receptor-controller.responses',
        value,
        offset: 0,
        partition: 58,
        highWaterOffset: 1,
        key: undefined
    };
}

describe('receptor handler unit tests', function () {

    let receptorError: any = null;
    let receptorErrorParse: any = null;

    beforeEach(() => {
        receptorError = getSandbox().spy(probes, 'receptorError');
        receptorErrorParse = getSandbox().spy(probes, 'receptorErrorParse');
    });

    /*
     * Payload parsing tests
     */
    test('parses ack message', async () => {
        const message = kafkaMessage(envelope(validAck));

        await handler(message);
        receptorError.callCount.should.equal(0);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses update message', async () => {
        const message = kafkaMessage(envelope(validUpdate));

        await handler(message);
        receptorError.callCount.should.equal(0);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses finished message', async () => {
        const message = kafkaMessage(envelope(validFinished));

        await handler(message);
        receptorError.callCount.should.equal(0);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('parses cancel message', async () => {
        const message = kafkaMessage(envelope(validCancel));

        await handler(message);
        receptorError.callCount.should.equal(0);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('throws error on invalid ack payload', async () => {
        const message = kafkaMessage(envelope(createInvalidPayload('playbook_run_ack')));

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid update payload', async () => {
        const message = kafkaMessage(envelope(createInvalidPayload('playbook_run_update')));

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid finished payload', async () => {
        const message = kafkaMessage(envelope(createInvalidPayload('playbook_run_finished')));

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    test('throws error on invalid cancel payload', async () => {
        const message = kafkaMessage(envelope(createInvalidPayload('playbook_run_cancel_ack')));

        await handler(message);
        receptorErrorParse.callCount.should.equal(1);
    });

    /*
     * Envelope parsing tests
     */
    test('parses a message with extra field', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: '{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "payload": "{}", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "foo": "bar"}',
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };

        await handler(message);
        receptorErrorParse.callCount.should.equal(0);
    });

    test('throws error on missing field (1)', async () => {
        const message = {
            topic: 'platform.receptor-controller.responses',
            value: `{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${validAck}}`,
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
            value: `{"account": "00001", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${validAck}}`,
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
            value: `{"account": "00001", "sender": "fifi", "message_type": "update", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${validAck}}`,
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
            value: `{"account": "00001", "sender": "fifi", "message_type": "update", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${validAck}}`,
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
            value: `{"account": "00001", "sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3, "payload": ${validAck}}`,
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
            value: '{"sender": "fifi", "message_id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "message_type": "update" "in_response_to": "477481a6-7371-4358-afda-aa74d0e1ac34", "serial": 3}',
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
