'use strict';

import log from './util/log';
import { client } from './metrics';
import config from './config';
import { Message } from 'kafka-node';
import { ReceptorMessage } from './handlers/receptor';
import { PlaybookRunCancelAck } from './handlers/receptor/playbookRunCancelAck';
import { PlaybookRunUpdate } from './handlers/receptor/playbookRunUpdate';

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
        'receptor_executor_not_found', 'Total number of cases when an executor is not found in a query', 'result'),
    receptorCancelAck: createCounter('receptor_cancel_ack_total', 'Total number of playbook_run_cancel_ack messages', 'status'),
    lostMessage: createCounter('lost_messages_total', 'Total number of updates lost when in DIFF mode'),
    advisor: createCounter('advisor_total', 'Total number of advisor update messages processed', 'result'),
    compliance: createCounter('compliance_total', 'Total number of compliance update messages processed', 'result'),
    patch: createCounter('patch_total', 'Total number of patch update messages processed', 'result'),
    vulnerability: createCounter(
        'vulnerability_total', 'Total number of vulnerability update messages processed', 'result')
};

// https://www.robustperception.io/existential-issues-with-metrics
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.remove.labels(value).inc(0));
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.advisor.labels(value).inc(0));
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.compliance.labels(value).inc(0));
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.patch.labels(value).inc(0));
['success', 'unknown', 'error', 'error_parse'].forEach(value => counters.vulnerability.labels(value).inc(0));
['error', 'error_parse', 'processed'].forEach(value => {
    ['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished', 'playbook_run_cancel_ack', 'unknown'].forEach(type => {
        counters.receptor.labels(value, type).inc(0);
    });
});
['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished'].forEach(value => counters.executorNotFound.labels(value).inc(0));

['cancelling', 'finished', 'failure'].forEach(value => counters.receptorCancelAck.labels(value).inc(0));

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

export function receptorPlaybookRunCancelAck (message: ReceptorMessage<PlaybookRunCancelAck>) {
    log.debug({message}, 'received playbook_run_cancel_ack');
    counters.receptorCancelAck.labels(message.payload.status).inc();
}

export function lostUpdateMessage (message: ReceptorMessage<PlaybookRunUpdate>) {
    log.warn({message}, 'lost update message before given message in sequence');
    counters.lostMessage.inc()
}

export function advisorUpdateSuccess (host_id: string, issue_id: string, references: number) {
    log.info({ host_id, issue_id, references }, 'advisor issue updated');
    counters.advisor.labels('success').inc();
};

export function advisorUpdateUnknown (host_id: string, issue_id: string) {
    log.debug({ host_id, issue_id }, 'host_id or issue_id not known');
    counters.advisor.labels('unknown').inc();
};

export function advisorUpdateError (host_id: string, issue_id: string, err: Error) {
    log.debug({ host_id, issue_id, err }, 'error updating advisor issue');
    counters.advisor.labels('error').inc();
};

export function advisorUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing advisor message');
    counters.compliance.labels('error_parse').inc();
};

export function complianceUpdateSuccess (host_id: string, issue_id: string, references: number) {
    log.info({ host_id, issue_id, references }, 'compliance issue updated');
    counters.compliance.labels('success').inc();
};

export function complianceUpdateUnknown (host_id: string, issue_id: string) {
    log.debug({ host_id, issue_id }, 'host_id or issue_id not known');
    counters.compliance.labels('unknown').inc();
};

export function complianceUpdateError (host_id: string, issue_id: string, err: Error) {
    log.error({ host_id, issue_id, err }, 'error updating compliance issue');
    counters.compliance.labels('error').inc();
};

export function complianceUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing compliance message');
    counters.compliance.labels('error_parse').inc();
};

export function patchUpdateSuccess (host_id: string, issue_id: string, references: number) {
    log.info({ host_id, issue_id, references }, 'patch issue updated');
    counters.patch.labels('success').inc();
};

export function patchUpdateUnknown (host_id: string, issue_id: string) {
    log.debug({ host_id, issue_id }, 'host_id or issue_id not known');
    counters.patch.labels('unknown').inc();
};

export function patchUpdateError (host_id: string, issue_id: string, err: Error) {
    log.error({ host_id, issue_id, err }, 'error updating patch issue');
    counters.patch.labels('error').inc();
};

export function patchUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing patch message');
    counters.patch.labels('error_parse').inc();
};

export function vulnerabilityUpdateSuccess (host_id: string, issue_id: string, references: number) {
    log.info({ host_id, issue_id, references }, 'vulnerability issue updated');
    counters.vulnerability.labels('success').inc();
};

export function vulnerabilityUpdateUnknown (host_id: string, issue_id: string) {
    log.debug({ host_id, issue_id }, 'host_id or issue_id not known');
    counters.vulnerability.labels('unknown').inc();
};

export function vulnerabilityUpdateError (host_id: string, issue_id: string, err: Error) {
    log.error({ host_id, issue_id, err }, 'error updating vulnerability issue');
    counters.vulnerability.labels('error').inc();
};

export function vulnerabilityUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing vulnerability message');
    counters.vulnerability.labels('error_parse').inc();
};
