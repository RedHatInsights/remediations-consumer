'use strict';

import log from './util/log';
import { client } from './metrics';
import config from './config';
import { Message } from 'kafka-node';

function createCounter (name: string, help: string, ...labelNames: string[]) {
    return new client.Counter({
        name: `${config.metrics.prefix}${name}`, help, labelNames
    });
}

const counters = {
    incoming: createCounter('messages_total', 'Total number of messages processed', 'topic'),
    remove: createCounter('remove_total', 'Total number of inventory delete messages processed', 'result'),
    receptor: createCounter('receptor_total', 'Total number of receptor messages processed', 'result')
};

// https://www.robustperception.io/existential-issues-with-metrics
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.remove.labels(value).inc(0));
['error_parse'].forEach(value => counters.receptor.labels(value).inc(0));

export function incomingMessage (message: Message) {
    log.trace({ message }, 'incoming message');
    counters.incoming.labels(message.topic).inc();
};

export function inventoryRemoveSuccess (id: string, references: number) {
    log.info({ id, references }, 'host removed');
    counters.remove.labels('success').inc();
};

export function inventoryRemoveUnknown (id: string) {
    log.debug({ id }, 'host not known');
    counters.remove.labels('unknown').inc();
};

export function inventoryRemoveError (id: string, err: Error) {
    log.error({ id, err }, 'error removing host');
    counters.remove.labels('error').inc();
};

export function inventoryRemoveErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing inventory message');
    counters.remove.labels('error_parse').inc();
};

export function receptorErrorParse (message: any, err: Error) {
    log.error({ message, err }, 'error parsing receptor message');
    counters.receptor.labels('error_parse').inc();
};

export function receptorError (message: any, err: Error) {
    log.error({ message, err }, 'error processing sat-receptor response');
    counters.receptor.labels('error').inc();
};
