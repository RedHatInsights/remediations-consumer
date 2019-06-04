'use strict';

import * as P from 'bluebird';
import * as db from './db';
import * as kafka from './kafka';
import config from './config';
import metrics from './metrics';
import version from './util/version';
import log from './util/log';
import handler, {pending} from './handlers/inventory';

const SHUTDOWN_DELAY = 5000;

process.on('unhandledRejection', (reason: any) => {
    log.fatal(reason);
    throw reason;
});

export default async function start () {
    log.info({env: config.env}, `${version.full} starting`);
    log.debug(config, 'configuration');

    await db.start();
    log.info('connected to database');

    const stopMetrics = metrics();

    const { consumer, stop: stopKafka } = kafka.start();
    consumer.on('data', handler);

    async function stop (e: Error | NodeJS.Signals | undefined) {
        consumer.off('error', stop);
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);

        if (e instanceof Error) {
            log.fatal(e, 'exiting due to error');
        } else {
            log.info({ reason: e }, 'shutting down');
        }

        try {
            consumer.pause();
            if (pending > 0) {
                log.info({ pending }, 'waiting for pending tasks to finish');
                await P.delay(SHUTDOWN_DELAY);
                if (pending > 0) {
                    log.warn({ pending }, 'shutting down despite pending tasks');
                } else {
                    log.info({ pending }, 'all finished');
                }
            }

            await stopKafka();
            await db.stop();
            stopMetrics();
        } finally {
            process.exit(e ? 1 : 0); // eslint-disable-line no-process-exit
        }
    }

    consumer.once('error', stop);
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}

if (require.main === module) {
    start();
}
