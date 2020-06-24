import * as db from '../../db';
import log from '../../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import { Message } from 'kafka-node';
import config from '../../config';
import { validate, parse } from '../common';

interface RemoveMessage {
    id: string;
    type: string;
}

const schema = Joi.object().keys({
    id: Joi.string().required(),
    type: Joi.string().required()
});

const EVENT_TYPE = 'delete';

function parseMessage (message: Message): RemoveMessage | undefined {
    try {
        const parsed = parse(message);

        if (!parsed || parsed.type !== EVENT_TYPE) {
            log.debug(message, 'ignoring message');
            return;
        }

        return validate(parsed, schema);
    } catch (e) {
        probes.inventoryRemoveErrorParse(message, e);
    }
}

export default async function onMessage (message: Message) {
    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

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
    }
}
