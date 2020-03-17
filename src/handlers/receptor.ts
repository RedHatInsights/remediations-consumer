import log from '../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../probes';
import { Message } from 'kafka-node';
import { validate, parse } from './common';
import * as _ from 'lodash';

const MESSAGE_TYPES = [
    'playbook_run_ack',
    'playbook_run_update',
    'playbook_run_finished',
    'playbook_run_cancel_ack'
];

interface ReceptorMessage {
    account: string;
    sender: string;
    message_id: string;
    message_type: string;
    payload: any;
}

const playbook_run_ack = Joi.object().keys({
    type: Joi.string().valid('playbook_run_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

const playbook_run_update = Joi.object().keys({
    type: Joi.string().valid('playbook_run_update').required(),
    playbook_run_id: Joi.string().guid().required(),
    sequence: Joi.number().required(),
    host: Joi.string().required(),
    console: Joi.string().required()
});

const playbook_run_finished = Joi.object().keys({
    type: Joi.string().valid('playbook_run_finished').required(),
    playbook_run_id: Joi.string().guid().required(),
    host: Joi.string().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required()
});

const playbook_run_cancel = Joi.object().keys({
    type: Joi.string().valid('playbook_run_cancel_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

const schema = Joi.object().keys({
    account: Joi.string().required(),
    sender: Joi.string().required(),
    message_id: Joi.string().guid().required(),
    message_type: Joi.string().required(),
    payload: Joi.any().required()
});

function validatePayload (payload: any, messageType: any): any {
    let validation: any;

    if (messageType === 'playbook_run_ack') {
        validation = validate<any>(payload, playbook_run_ack);
    }

    if (messageType === 'playbook_run_update') {
        validation = validate<any>(payload, playbook_run_update);
    }

    if (messageType === 'playbook_run_finished') {
        validation = validate<any>(payload, playbook_run_finished);
    }

    if (messageType === 'playbook_run_cancel_ack') {
        validation = validate<any>(payload, playbook_run_cancel);
    }

    return validation;
}

function strictValidate (parsed: any, messageType: any): ReceptorMessage | undefined {
    const messageValidation = validate<ReceptorMessage | undefined>(parsed, schema);

    if (_.isError(messageValidation)) {
        throw messageValidation;
    }

    const payloadValidation = validatePayload(parsed.payload, messageType);

    if (_.isError(payloadValidation)) {
        throw payloadValidation;
    }

    return messageValidation;
}

function getMessageType (type: any): any {
    if (_.includes(MESSAGE_TYPES, type)) {
        return type;
    }

    return;
}

function parseMessage (message: Message): ReceptorMessage | undefined {
    try {
        const parsed = parse(message);
        const messageType = getMessageType(parsed.payload.type);

        if (!parsed || _.isUndefined(messageType)) {
            log.debug(message, 'ignoring message');
            return;
        }

        return strictValidate(parsed, messageType);
    } catch (e) {
        probes.receptorErrorParse(message, e);
    }
}

export default async function onMessage (message: Message) {
    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    log.info({message, parsed}, 'receptor message');
}
