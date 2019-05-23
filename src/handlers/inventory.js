'use strict';

const log = require('../util/log');

// {"id": <host id>, "timestamp": <delete timestamp>, "type": "delete"}
module.exports = async function (message) {
    log.info(message, 'inventory message received');
};
