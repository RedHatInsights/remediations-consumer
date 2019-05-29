'use strict';

const log = require('./util/log');
const metrics = require('./metrics');
const { prefix } = require('./config').get('metrics');

function createCounter (name, help, ...labelNames) {
    return new metrics.client.Counter({
        name: `${prefix}${name}`, help, labelNames
    });
}

const counters = {
    incoming: createCounter('messages_total', 'Total number of messages processed'),
    remove: createCounter('remove_total', 'Total number of inventory delete messages processed', 'result')
};

// https://www.robustperception.io/existential-issues-with-metrics
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.remove.labels(value).inc(0));

exports.inventoryIncomingMessage = function (message) {
    log.trace({ message }, 'incoming message');
    counters.incoming.inc();
};

exports.inventoryRemoveSuccess = function (id, references) {
    log.info({ id, references }, 'host removed');
    counters.remove.labels('success').inc();
};

exports.inventoryRemoveUnknown = function (id) {
    log.debug({ id }, 'host not known');
    counters.remove.labels('unknown').inc();
};

exports.inventoryRemoveError = function (id, err) {
    log.error({ id, err }, 'error removing host');
    counters.remove.labels('error').inc();
};

exports.inventoryRemoveErrorParse = function (message, err) {
    log.error({ message, err }, 'error parsing message');
    counters.remove.labels('error_parse').inc();
};
