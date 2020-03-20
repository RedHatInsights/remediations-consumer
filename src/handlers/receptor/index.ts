import log from '../../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import { Message } from 'kafka-node';
import { validate, parse } from '../common';
import * as _ from 'lodash';
import * as playbookRunAck from './playbookRunAck';
import * as playbookRunUpdate from './playbookRunUpdate';
import * as playbookRunFinished from './playbookRunFinished';
import * as playbookRunCancelAck from './playbookRunCancelAck';

export interface ReceptorMessage<T> {
    account: string;
    sender: string;
    message_id: string;
    message_type: string;
    payload: T;
    in_response_to: string;
    serial: number;
}

const envelopeSchema = Joi.object().keys({
    account: Joi.string().required(),
    sender: Joi.string().required(),
    message_id: Joi.string().guid().required(),
    message_type: Joi.string().required(),
    payload: Joi.any().required(),
    in_response_to: Joi.string().guid().required(),
    serial: Joi.number().required()
});

interface SatReceptorResponseHandler<T> {
    schema: Joi.ObjectSchema;
    handle: (message: ReceptorMessage<T>) => void;
}

export interface SatReceptorResponse {
    type: string;
}

function parseMessage (message: Message): ReceptorMessage<any> | undefined {
    try {
        const parsed = parse(message);
        if (!parsed) {
            return;
        }

        return validate<ReceptorMessage<any>>(parsed, envelopeSchema);
    } catch (e) {
        probes.receptorErrorParse(message, e);
    }
}

function getPayloadType (payload: any): string {
    return _.get(payload, 'type', 'unknown');
}

async function handleSatResponse<T extends SatReceptorResponse> (
    message: ReceptorMessage<any>,
    handler: SatReceptorResponseHandler<T>
) {
    try {
        validate<T>(message.payload, handler.schema);
    } catch (e) {
        probes.receptorErrorParse(message, e);
        return;
    }

    try {
        await handler.handle(message);
    } catch (e) {
        probes.receptorError(message, e);
    }
}

export default async function onMessage (message: Message) {
    const envelope = parseMessage(message);
    if (!envelope) {
        log.debug(message, 'ignoring message');
        return;
    }

    const payloadType = getPayloadType(envelope.payload);
    switch (payloadType) {
        case 'playbook_run_ack': {
            await handleSatResponse<playbookRunAck.PlaybookRunAck>(envelope, playbookRunAck);
            break;
        }

        case 'playbook_run_update': {
            await handleSatResponse<playbookRunUpdate.PlaybookRunUpdate>(envelope, playbookRunUpdate);
            break;
        }

        case 'playbook_run_finished': {
            await handleSatResponse<playbookRunFinished.PlaybookRunFinished>(envelope, playbookRunFinished);
            break;
        }

        case 'playbook_run_cancel_ack': {
            await handleSatResponse<playbookRunCancelAck.PlaybookRunCancelAck>(envelope, playbookRunCancelAck);
            break;
        }

        default: {
            if (payloadType === 'unknown') {
                log.trace('ignoring message with missing payload type');
            } else {
                log.warn({type: payloadType}, 'ignoring unknown payload type');
            }

        }
    }

}
