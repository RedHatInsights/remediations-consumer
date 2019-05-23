'use strict';

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
    protocol: ['roundrobin']
}, config.topics.inventory.topic));

exports.start = function () {
    const client = consumer.consumerGroup.client;
    consumer.pause();

    client.connect();

    consumer.resume();
    return consumer;
};

exports.stop = function () {
    return consumer.closeAsync();
};
