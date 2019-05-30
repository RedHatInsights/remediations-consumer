'use strict';

const pino = require('pino');
const config = require('../config').get('logging');

const logger = pino({
    name: 'remediations-consumer',
    level: config.level,
    prettyPrint: config.pretty ? {
        errorProps: '*'
    } : false
});

module.exports = logger.child({ type: 'application' });

