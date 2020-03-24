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
    receptor: createCounter('receptor_total', 'Total number of receptor messages processed', 'result', 'type'),
    executorNotFound: createCounter(
        'receptor_executor_not_found', 'Total number of cases when an executor is not found in a query', 'result')
};

// https://www.robustperception.io/existential-issues-with-metrics
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.remove.labels(value).inc(0));
['error', 'error_parse', 'processed'].forEach(value => {
    ['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished', 'playbook_run_cancel_ack', 'unknown'].forEach(type => {
        counters.receptor.labels(value, type).inc(0);
    });
});
['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished'].forEach(value => counters.executorNotFound.labels(value).inc(0));

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
    counters.receptor.labels('error_parse', 'unknown').inc();
};

export function receptorError (message: any, err: Error) {
    log.error({ message, err }, 'error processing sat-receptor response');
    counters.receptor.labels('error', message.payload.type).inc();
};

export function receptorProcessed (type: string) {
    counters.receptor.labels('processed', type).inc();
}

export function noExecutorFound (responseType: string, criteria: Record<string, string>) {
    log.warn({responseType, criteria}, 'no executor matched');
    counters.executorNotFound.labels(responseType).inc();
}
