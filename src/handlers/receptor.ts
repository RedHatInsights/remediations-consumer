import log from '../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../probes';
import { Message } from 'kafka-node';

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

function validate (value: ReceptorMessage): ReceptorMessage {
    const { error } = Joi.validate(value, schema, {allowUnknown: true});
    if (error) {
        throw error;
    }

    return value;
}

function parseMessage (message: Message): ReceptorMessage | undefined {
    try {
        const parsed = JSON.parse(message.value.toString());

        if (!parsed) {
            log.debug(message, 'ignoring message');
            return;
        }

        return validate(parsed);
    } catch (e) {
        probes.receptorUpdateErrorParse(message, e);
    }
}

export default async function onMessage (message: Message) {
    probes.receptorIncomingMessage(message);

    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }
}
