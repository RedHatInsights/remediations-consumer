import log from '../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../probes';
import { Message } from 'kafka-node';
import { validate, parse } from './common';
import * as _ from 'lodash';

interface ReceptorMessage<T> {
    account: string;
    sender: string;
    message_id: string;
    message_type: string;
    payload: T;
    in_response_to: string;
    serial: number;
}

const schema = Joi.object().keys({
    account: Joi.string().required(),
    sender: Joi.string().required(),
    message_id: Joi.string().guid().required(),
    message_type: Joi.string().required(),
    payload: Joi.any().required(),
    in_response_to: Joi.string().guid().required(),
    serial: Joi.number().required()
});

interface SatReceptorResponse {
    type: string; // TODO: enum?
}

interface PlaybookRunAck extends SatReceptorResponse {
    playbook_run_id: string;
}

const playbook_run_ack = Joi.object().keys({
    type: Joi.string().valid('playbook_run_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

interface PlaybookRunUpdate extends SatReceptorResponse {
    playbook_run_id: string;
    sequence: number;
    host: string;
    console: string;
}

const playbook_run_update = Joi.object().keys({
    type: Joi.string().valid('playbook_run_update').required(),
    playbook_run_id: Joi.string().guid().required(),
    sequence: Joi.number().required(),
    host: Joi.string().required(),
    console: Joi.string().required()
});

interface PlaybookRunFinished extends SatReceptorResponse {
    playbook_run_id: string;
    host: string;
    status: string;
}

const playbook_run_finished = Joi.object().keys({
    type: Joi.string().valid('playbook_run_finished').required(),
    playbook_run_id: Joi.string().guid().required(),
    host: Joi.string().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required()
});

interface PlaybookRunCancelAck extends SatReceptorResponse {
    playbook_run_id: string;
}

const playbook_run_cancel_ack = Joi.object().keys({
    type: Joi.string().valid('playbook_run_cancel_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

function parseMessage (message: Message): ReceptorMessage<any> | undefined {
    try {
        const parsed = parse(message);
        if (!parsed) {
            return;
        }

        return validate<ReceptorMessage<any>>(parsed, schema);
    } catch (e) {
        probes.receptorErrorParse(message, e);
    }
}

function getPayloadType (payload: any): string {
    return _.get(payload, 'type', 'unknown');
}

async function handleSatResponse<T extends SatReceptorResponse> (
    message: ReceptorMessage<any>,
    schema: Joi.ObjectSchema,
    handler: (message: ReceptorMessage<T>) => void
) {
    try {
        validate<T>(message.payload, schema);
    } catch (e) {
        probes.receptorErrorParse(message, e);
        return;
    }

    try {
        await handler(message);
    } catch (e) {
        probes.receptorError(message, e);
    }
}

async function handlePlaybookRunAck (message: ReceptorMessage<PlaybookRunAck>) {
    log.info({message}, 'received playbook_run_ack');
}

async function handlePlaybookRunUpdate (message: ReceptorMessage<PlaybookRunUpdate>) {
    log.info({message}, 'received playbook_run_update');
}

async function handlePlaybookRunFinished (message: ReceptorMessage<PlaybookRunFinished>) {
    log.info({message}, 'received playbook_run_finished');
}

async function handlePlaybookRunCancelAck (message: ReceptorMessage<PlaybookRunCancelAck>) {
    log.info({message}, 'received playbook_run_cancel_ack');
}

export default async function onMessage (message: Message) {
    const envelope = parseMessage(message);
    if (!envelope) {
        log.debug(message, 'ignoring message');
        return;
    }

    log.info({message, envelope}, 'receptor message');

    const payloadType = getPayloadType(envelope.payload);
    switch (payloadType) {
        case 'playbook_run_ack': {
            await handleSatResponse<PlaybookRunAck>(envelope, playbook_run_ack, handlePlaybookRunAck);
            break;
        }

        case 'playbook_run_update': {
            await handleSatResponse<PlaybookRunUpdate>(envelope, playbook_run_update, handlePlaybookRunUpdate);
            break;
        }

        case 'playbook_run_finished': {
            await handleSatResponse<PlaybookRunFinished>(envelope, playbook_run_finished, handlePlaybookRunFinished);
            break;
        }

        case 'playbook_run_cancel_ack': {
            await handleSatResponse<PlaybookRunCancelAck>(envelope, playbook_run_cancel_ack, handlePlaybookRunCancelAck);
            break;
        }

        default: {
            log.warn({type: payloadType}, 'ignoring unknown payload type');
        }
    }

}
