import * as db from './db';
import * as kafka from './kafka';
import config, { sanitized } from './config';
import metrics from './metrics';
import version from './util/version';
import log from './util/log';
import * as format from './format';

process.on('unhandledRejection', (reason: any) => {
    log.fatal(reason);
    throw reason;
});

export default async function start () {
    log.info({env: config.env}, `${version.full} starting`);
    log.debug(sanitized, 'configuration');

    await db.start();
    log.info('connected to database');

    const stopMetrics = metrics();

    const topicDetails = format.formatTopicDetails();

    const { consumer, stop: stopKafka } = await kafka.start(topicDetails);

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
