import config from '../config';
import log from '../util/log';

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

export function start () {
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
