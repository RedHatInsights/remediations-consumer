import log from '../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../probes';
import { Message } from 'kafka-node';
import { validate, parse } from './common';

interface ReceptorMessage {
    account: string;
    sender: string;
    message_id: string;
    message_type: string;
    payload: any;
}

const schema = Joi.object().keys({
    account: Joi.string().required(),
    sender: Joi.string().required(),
    message_id: Joi.string().guid().required(),
    message_type: Joi.string().required(),
    payload: Joi.any().required()
});

function parseMessage (message: Message): ReceptorMessage | undefined {
    try {
        const parsed = parse(message);

        if (!parsed) {
            log.debug(message, 'ignoring message');
            return;
        }

        return validate(parsed, schema);
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
