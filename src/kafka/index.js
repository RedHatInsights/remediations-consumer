'use strict';

const config = require('../config').get('kafka');
const log = require('../util/log');

function kafkaLogger (type) {
    const child = log.child({type});

    return {
        debug: child.debug.bind(child),
        info: child.info.bind(child),
        warn: child.warn.bind(child),
        error: child.error.bind(child)
    };
}

if (config.logging) {
    require('kafka-node/logging').setLoggerProvider(kafkaLogger);
}

const P = require('bluebird');
const kafka = require('kafka-node');

const consumer = P.promisifyAll(new kafka.ConsumerGroupStream({
    kafkaHost: config.host,
    autoConnect: false,
    groupId: config.topics.inventory.consumerGroup,
    fromOffset: 'earliest',
    autoCommit: config.autoCommit,
    autoCommitIntervalMs: 5000,
    protocol: ['roundrobin'],
    highWaterMark: 5
}, config.topics.inventory.topic));

async function resetOffsets (topic) {
    log.info({ topic }, 'reseting offsets for topic');
    const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
    const offsets = await offset.fetchEarliestOffsetsAsync([topic]);
    Object.entries(offsets[topic]).forEach(setting => { // eslint-disable-line security/detect-object-injection
        consumer.consumerGroup.setOffset(topic, parseInt(setting[0]), setting[1]);
    });
}

exports.start = function () {
    const client = consumer.consumerGroup.client;
    consumer.pause();

    client.connect();

    consumer.resume();
    consumer.consumerGroup.client.on('ready', () => log.info('connected to Kafka'));
    consumer.consumerGroup.on('rebalanced', async () => {
        if (config.topics.inventory.resetOffsets) {
            await resetOffsets(config.topics.inventory.topic);
        }

        const offset = P.promisifyAll(consumer.consumerGroup.getOffset());
        const offsets = await offset.fetchLatestOffsetsAsync([config.topics.inventory.topic]);
        log.debug(offsets, 'current offsets');
    });

    return consumer;
};

exports.get = function () {
    return consumer;
};

exports.stop = function () {
    return consumer.closeAsync();
};
