'use strict';

const log = require('../util/log');
const Joi = require('@hapi/joi');

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

module.exports = async function (message) {
    log.debug(message, 'received inventory message');

    let value = null;

    try {
        value = validate(JSON.parse(message.value));
    } catch (e) {
        log.error(e, 'error parsing message');
        return;
    }

    if (value.type !== EVENT_TYPE) {
        log.debug(value, 'ignoring message');
        return;
    }

    log.debug({ id: value.id }, 'about to delete host');
};
