'use strict';

const db = require('../db');
const log = require('../util/log');
const Joi = require('@hapi/joi');
const probes = require('../probes');

// {"id": <host id>, "timestamp": <delete timestamp>, "type": "delete"}
const schema = Joi.object().keys({
    id: Joi.string().required(),
    type: Joi.string().required()
});

const EVENT_TYPE = 'delete';

function validate (value) {
    const { error } = Joi.validate(value, schema, {allowUnknown: true});
    if (error) {
        throw error;
    }

    return value;
}

function parseMessage (message) {
    try {
        const parsed = JSON.parse(message.value);

        if (!parsed || parsed.type !== EVENT_TYPE) {
            log.debug(message, 'ignoring message');
            return;
        }

        return validate(parsed);
    } catch (e) {
        probes.inventoryRemoveErrorParse(message, e);
    }
}

module.exports = async function (message) {
    probes.inventoryIncomingMessage(message);

    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    module.exports.pending++;
    const { id } = parsed;

    try {
        const result = await db.deleteSystem(id);
        if (result > 0) {
            probes.inventoryRemoveSuccess(id, result);
        } else {
            probes.inventoryRemoveUnknown(id);
        }
    } catch (e) {
        probes.inventoryRemoveError(id, e);
    } finally {
        module.exports.pending--;
    }
};

module.exports.pending = 0;
