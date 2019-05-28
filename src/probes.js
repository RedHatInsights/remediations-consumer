'use strict';

const log = require('./util/log');

exports.inventoryIncomingMessage = function (message) {
    log.trace({ message }, 'incoming message');
};

exports.inventoryRemoveSuccess = function (id, references) {
    log.info({ id, references }, 'host removed');
};

exports.inventoryRemoveUnknown = function (id) {
    log.debug({ id }, 'host not known');
};

exports.inventoryRemoveError = function (id, err) {
    log.error({ id, err }, 'error removing host');
};

exports.inventoryRemoveErrorParse = function (message, err) {
    log.error({ message, err }, 'error parsing message');
};
