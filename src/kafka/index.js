'use strict';

const log = require('../util/log');
const P = require('bluebird');
const kafka = require('kafka-node');
const config = require('../config').get('kafka');

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

exports.start = function () {
    const client = consumer.consumerGroup.client;
    consumer.pause();

    client.connect();

    consumer.resume();
    consumer.consumerGroup.client.on('ready', async () => {
        log.info('connected to Kafka');
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
