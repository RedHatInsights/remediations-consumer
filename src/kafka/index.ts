/* eslint-disable max-len */

import * as _ from 'lodash';
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
import { TopicConfig } from '../format';
import * as probes from '../probes';

const consumer = P.promisifyAll(new kafka.ConsumerGroupStream({
    kafkaHost: config.kafka.host,
    autoConnect: false,
    groupId: config.kafka.consumerGroup,
    fromOffset: 'earliest',
    autoCommit: config.kafka.autoCommit,
    autoCommitIntervalMs: 5000,
    protocol: ['roundrobin'],
    highWaterMark: 5
}, [
    config.kafka.topics.inventory.topic,
    config.kafka.topics.receptor.topic,
    config.kafka.topics.advisor.topic,
    config.kafka.topics.compliance.topic,
    config.kafka.topics.patch.topic,
    config.kafka.topics.vulnerability.topic
]));

async function resetOffsets (topic: string) {
    log.info({ topic }, 'reseting offsets for topic');
    const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
    const offsets = await offset.fetchEarliestOffsetsAsync([topic]);
    Object.entries<number>(offsets[topic]).forEach(setting => { // eslint-disable-line security/detect-object-injection
        consumer.consumerGroup.setOffset(topic, parseInt(setting[0]), setting[1]);
    });
}

function connect (topicConfig: TopicConfig[]) {
    const client = consumer.consumerGroup.client;
    consumer.pause();

    client.connect();

    consumer.resume();
    consumer.consumerGroup.client.on('ready', () => log.info('connected to Kafka'));
    consumer.consumerGroup.on('rebalanced', async () => {
        await P.mapSeries(topicConfig, topicConfig => {
            if (topicConfig.resetOffsets) {
                return resetOffsets(topicConfig.topic);
            }
        });

        const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
        const offsets = await offset.fetchLatestOffsetsAsync([
            config.kafka.topics.inventory.topic,
            config.kafka.topics.receptor.topic,
            config.kafka.topics.advisor.topic,
            config.kafka.topics.compliance.topic,
            config.kafka.topics.patch.topic,
            config.kafka.topics.vulnerability.topic
        ]);

        log.debug(offsets, 'current offsets');
    });

    return {
        consumer,
        stop () {
            return consumer.closeAsync();
        }
    };
}

export async function start (topicConfig: TopicConfig[]) {
    const {consumer, stop} = await connect(topicConfig);

    const handlers: Record<string, (message: kafka.Message) => void> =
        _(topicConfig).keyBy('topic').mapValues(details => details.handler).value();

    const router: any = async (message: kafka.Message) => {
        probes.incomingMessage(message);
        const handler = handlers[message.topic];
        await handler(message);
    };

    const q = queue(router, config.kafka.concurrency);
    q.saturated(() => consumer.pause());
    q.unsaturated(() => consumer.resume());

    consumer.on('data', message => q.push(message));

    return {
        consumer,
        async stop () {
            q.pause();
            consumer.pause();
            if (q.length() > 0) {
                log.info({ pending: q.length() }, 'waiting for pending inventory tasks to finish');
                await P.delay(SHUTDOWN_DELAY);
                if (q.length() > 0) {
                    log.error({ pending: q.length() }, 'shutting down despite pending inventory tasks');
                } else {
                    log.info({ pending: q.length() }, 'all inventory tasks finished');
                }
            }

            await stop();
        }
    };
}
