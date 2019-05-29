'use strict';

const P = require('bluebird');
const db = require('./db');
const kafka = require('./kafka');
const config = require('./config');
const metrics = require('./metrics');
const version = require('./util/version');
const log = require('./util/log');
const inventoryHandler = require('./handlers/inventory');
const SHUTDOWN_DELAY = 5000;

exports.start = async function () {
    log.info({env: config.env}, `${version.full} starting`);
    log.debug(config.toString());

    await db.start();
    log.info('connected to database');

    metrics.start();

    const consumer = kafka.start();
    consumer.on('data', inventoryHandler);

    consumer.once('error', exports.stop);
    process.on('SIGINT', exports.stop);
    process.on('SIGTERM', exports.stop);
};

exports.stop = async function (e) {
    kafka.get().off('error', exports.stop);
    process.off('SIGINT', exports.stop);
    process.off('SIGTERM', exports.stop);

    if (e instanceof Error) {
        log.fatal(e, 'exiting due to error');
    } else {
        log.info({ reason: e }, 'shutting down');
    }

    try {
        kafka.get().pause();
        if (inventoryHandler.pending > 0) {
            log.info({ pending: inventoryHandler.pending}, 'waiting for pending tasks to finish');
            await P.delay(SHUTDOWN_DELAY);
            if (inventoryHandler.pending > 0) {
                log.warn({ pending: inventoryHandler.pending}, 'shutting down despite pending tasks');
            } else {
                log.info({ pending: inventoryHandler.pending}, 'all finished');
            }
        }

        await kafka.stop();
        await db.stop();
        metrics.stop();
    } finally {
        process.exit(e ? 1 : 0); // eslint-disable-line no-process-exit
    }
};

if (require.main === module) {
    exports.start();
}
