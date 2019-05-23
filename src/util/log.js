'use strict';

const pino = require('pino');
const config = require('../config').get('logging');

module.exports = pino({
    name: 'remediations-consumer',
    level: config.level,
    prettyPrint: config.pretty ? {
        errorProps: '*'
    } : false
});

