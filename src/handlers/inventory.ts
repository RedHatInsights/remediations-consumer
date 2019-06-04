import * as db from '../db';
import log from '../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../probes';
import { Message } from 'kafka-node';
import config from '../config';

interface RemoveMessage {
    id: string;
    type: string;
}

const schema = Joi.object().keys({
    id: Joi.string().required(),
    type: Joi.string().required()
});

const EVENT_TYPE = 'delete';

function validate (value: RemoveMessage): RemoveMessage {
    const { error } = Joi.validate(value, schema, {allowUnknown: true});
    if (error) {
        throw error;
    }

    return value;
}

function parseMessage (message: Message): RemoveMessage | undefined {
    try {
        const parsed = JSON.parse(message.value.toString());

        if (!parsed || parsed.type !== EVENT_TYPE) {
            log.debug(message, 'ignoring message');
            return;
        }

        return validate(parsed);
    } catch (e) {
        probes.inventoryRemoveErrorParse(message, e);
    }
}

export let pending = 0;

export default async function onMessage (message: Message) {
    probes.inventoryIncomingMessage(message);

    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    pending++;
    const { id } = parsed;

    try {
        const result = await db.deleteSystem(id, config.db.dryRun);
        if (result > 0) {
            if (config.db.dryRun) {
                log.info({ id, references: result }, 'host would be removed (dry run)');
            } else {
                probes.inventoryRemoveSuccess(id, result);
            }
        } else {
            probes.inventoryRemoveUnknown(id);
        }
    } catch (e) {
        probes.inventoryRemoveError(id, e);
    } finally {
        pending--;
    }
}
