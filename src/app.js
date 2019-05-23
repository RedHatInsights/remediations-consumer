'use strict';

const kafka = require('./kafka');
const config = require('./config');
const version = require('./util/version');
const log = require('./util/log');
const inventoryHandler = require('./handlers/inventory');

async function run () {
    log.info({env: config.env}, `${version.full} starting`);

    const consumer = kafka.start();

    consumer.consumerGroup.client.on('ready', () => log.info('connected to Kafka'));

    consumer.on('data', inventoryHandler);

    consumer.once('error', exit);
    process.on('SIGINT', exit);
}

async function exit (e) {
    if (e instanceof Error) {
        log.fatal(e, 'exiting due to error');
    } else {
        log.info({ reason: e }, 'exiting');
    }

    try {
        await kafka.stop();
    } finally {
        process.exit(e ? 1 : 0); // eslint-disable-line no-process-exit
    }
}

run();
