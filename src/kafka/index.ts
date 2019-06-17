import { Message } from 'kafka-node';
import { queue } from 'async';

import config from '../config';
import log from '../util/log';

const SHUTDOWN_DELAY = 5000;

function kafkaLogger (type: string) {
    const child = log.child({type});

    return {
        debug: child.trace.bind(child),
        info: child.info.bind(child),
        warn: child.warn.bind(child),
        error: child.error.bind(child)
    };
}

if (config.kafka.logging) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('kafka-node/logging').setLoggerProvider(kafkaLogger);
}

import * as P from 'bluebird';
import * as kafka from 'kafka-node';

const consumer = P.promisifyAll(new kafka.ConsumerGroupStream({
    kafkaHost: config.kafka.host,
    autoConnect: false,
    groupId: config.kafka.topics.inventory.consumerGroup,
    fromOffset: 'earliest',
    autoCommit: config.kafka.autoCommit,
    autoCommitIntervalMs: 5000,
    protocol: ['roundrobin'],
    highWaterMark: 5
}, config.kafka.topics.inventory.topic));

async function resetOffsets (topic: string) {
    log.info({ topic }, 'reseting offsets for topic');
    const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
    const offsets = await offset.fetchEarliestOffsetsAsync([topic]);
    Object.entries<number>(offsets[topic]).forEach(setting => { // eslint-disable-line security/detect-object-injection
        consumer.consumerGroup.setOffset(topic, parseInt(setting[0]), setting[1]);
    });
}

function connect () {
    const client = consumer.consumerGroup.client;
    consumer.pause();

    client.connect();

    consumer.resume();
    consumer.consumerGroup.client.on('ready', () => log.info('connected to Kafka'));
    consumer.consumerGroup.on('rebalanced', async () => {
        if (config.kafka.topics.inventory.resetOffsets) {
            await resetOffsets(config.kafka.topics.inventory.topic);
        }

        const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
        const offsets = await offset.fetchLatestOffsetsAsync([config.kafka.topics.inventory.topic]);
        log.debug(offsets, 'current offsets');
    });

    return {
        consumer,
        stop () {
            return consumer.closeAsync();
        }
    };
}

export async function start (handler: (message: Message) => any, concurrency = 1) {
    const {consumer, stop} = await connect();

    const q = queue(handler, concurrency);
    q.saturated(() => consumer.pause());
    q.unsaturated(() => consumer.resume());

    consumer.on('data', message => q.push(message));

    return {
        consumer,
        async stop () {
            q.pause();
            consumer.pause();
            if (q.length() > 0) {
                log.info({ pending: q.length() }, 'waiting for pending tasks to finish');
                await P.delay(SHUTDOWN_DELAY);
                if (q.length() > 0) {
                    log.error({ pending: q.length() }, 'shutting down despite pending tasks');
                } else {
                    log.info({ pending: q.length() }, 'all finished');
                }
            }

            await stop();
        }
    };
}
