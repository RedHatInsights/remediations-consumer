import * as db from './db';
import * as kafka from './kafka';
import config, { sanitized } from './config';
import metrics from './metrics';
import version from './util/version';
import log from './util/log';
import * as format from './format';
import * as _ from 'lodash';
import { InstrumentationEvent } from 'kafkajs';

process.on('unhandledRejection', (reason: any) => {
    log.fatal(reason);
    throw reason;
});

export default async function start () {
    log.info({env: config.env}, `${version.full} starting`);
    log.debug(sanitized, 'configuration');

    await db.start(config.db);
    log.info('connected to database');

    const stopMetrics = metrics();

    const topicDetails = format.formatTopicDetails();

    const filteredTopicDetails = _.compact(topicDetails.map(topic => {
        if (topic.enabled === false) {
            return;
        }

        return topic;
    }));

    if (_.isEmpty(filteredTopicDetails)) {
        throw 'No topics were provided to the consumer, Spinning down';
    }

    const { consumer, stop: stopKafka } = await kafka.start(filteredTopicDetails);

    async function stop (e: Error | NodeJS.Signals | undefined | InstrumentationEvent<any>) {
        consumer.stop();
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

    consumer.on('consumer.crash', stop);
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}

if (require.main === module) {
    start();
}
