'use strict';

import log from './util/log';
import { client } from './metrics';
import config from './config';
import { Message } from 'kafkajs'
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
        'vulnerability_total', 'Total number of vulnerability update messages processed', 'result'),
    dispatcherRun: createCounter('dispatcher_run_update_total', 'Dispatcher run status updates', 'result', 'status')
};

// https://www.robustperception.io/existential-issues-with-metrics
['success', 'unknown_host', 'unknown_issue', 'error', 'error_parse'].forEach(value => counters.remove.labels(value).inc(0));
['success', 'unknown_host', 'unknown_issue', 'error', 'error_parse'].forEach(value => counters.advisor.labels(value).inc(0));
['success', 'unknown_host', 'unknown_issue', 'error', 'error_parse'].forEach(value => counters.compliance.labels(value).inc(0));
['success', 'unknown_host', 'unknown_issue', 'error', 'error_parse'].forEach(value => counters.patch.labels(value).inc(0));
['success', 'unknown_host', 'unknown_issue', 'error', 'error_parse'].forEach(value => counters.vulnerability.labels(value).inc(0));
['updated', 'not_found', 'error', 'error_parse'].forEach(result =>
    ['success', 'failure', 'running', 'timeout'].forEach(
        status => counters.dispatcherRun.labels(result, status).inc(0)
    )
);
['error', 'error_parse', 'processed'].forEach(value => {
    ['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished', 'playbook_run_cancel_ack', 'playbook_run_completed', 'unknown'].forEach(type => {
        counters.receptor.labels(value, type).inc(0);
    });
});
['playbook_run_ack', 'playbook_run_update', 'playbook_run_finished', 'playbook_run_completed'].forEach(value => counters.executorNotFound.labels(value).inc(0));

['cancelling', 'finished', 'failure'].forEach(value => counters.receptorCancelAck.labels(value).inc(0));

export function incomingMessage (topic: string, message: Message) {
    log.trace({ message }, 'incoming message');
    counters.incoming.labels(topic).inc();
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

export function advisorUpdateSuccess (host_id: string, issues: string[], references: number) {
    log.info({ host_id, references }, 'advisor issues successfully updated');
    log.debug({ issues }, 'updated advisor issues');
    counters.advisor.labels('success').inc();
};

export function advisorHostUnknown (host_id: string) {
    log.debug({ host_id }, 'advisor host_id not known');
    counters.advisor.labels('unknown_host').inc();
};

export function advisorIssueUnknown (host_id: string, issues: string[]) {
    log.debug({ host_id, issues }, 'advisor issue_id not known');
    counters.advisor.labels('unknown_issue').inc();
};

export function advisorUpdateError (host_id: string, issues: string[], err: Error) {
    log.error({ host_id, issues, err }, 'error updating advisor issue');
    counters.advisor.labels('error').inc();
};

export function advisorUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing advisor message');
    counters.compliance.labels('error_parse').inc();
};

export function complianceUpdateSuccess (host_id: string, issues: string[], references: number) {
    log.info({ host_id, references }, 'compliance issues successfully updated');
    log.debug({ issues }, 'updated compliance issues');
    counters.compliance.labels('success').inc();
};

export function complianceHostUnknown (host_id: string) {
    log.debug({ host_id }, 'compliance host_id not known');
    counters.compliance.labels('unknown_host').inc();
};

export function complianceIssueUnknown (host_id: string, issues: string[]) {
    log.debug({ host_id, issues }, 'compliance issue_id not known');
    counters.compliance.labels('unknown_issue').inc();
};

export function complianceUpdateError (host_id: string, issues: Array<string>, err: Error) {
    log.error({ host_id, issues, err }, 'error updating compliance issue');
    counters.compliance.labels('error').inc();
};

export function complianceUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing compliance message');
    counters.compliance.labels('error_parse').inc();
};

export function patchUpdateSuccess (host_id: string, issues: string[], references: number) {
    log.info({ host_id, references }, 'patch issues successfully updated');
    log.debug({ issues }, 'updated patch issues')
    counters.patch.labels('success').inc();
};

export function patchHostUnknown (host_id: string) {
    log.debug({ host_id }, 'patch host_id not known');
    counters.patch.labels('unknown_host').inc();
};

export function patchIssueUnknown (host_id: string, issues: string[]) {
    log.debug({ host_id, issues }, 'patch issue_id not known');
    counters.patch.labels('unknown_issue').inc();
};

export function patchUpdateError (host_id: string, issues: Array<string>, err: Error) {
    log.error({ host_id, issues, err }, 'error updating patch issue');
    counters.patch.labels('error').inc();
};

export function patchUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing patch message');
    counters.patch.labels('error_parse').inc();
};

export function vulnerabilityUpdateSuccess (host_id: string, issues: string[], references: number) {
    log.info({ host_id, references }, 'vulnerability issues successfully updated');
    log.debug({ issues }, 'updated vulnerabilitiy issues');
    counters.vulnerability.labels('success').inc();
};

export function vulnerabilityHostUnknown (host_id: string) {
    log.debug({ host_id }, 'vulnerability host_id not known');
    counters.vulnerability.labels('unknown_host').inc();
};

export function vulnerabilityIssueUnknown (host_id: string, issues: string[]) {
    log.debug({ host_id, issues }, 'vulnerability issue_id not known');
    counters.vulnerability.labels('unknown_issue').inc();
};

export function vulnerabilityUpdateError (host_id: string, issues: Array<string>, err: Error) {
    log.error({ host_id, issues, err }, 'error updating vulnerability issue');
    counters.vulnerability.labels('error').inc();
};

export function vulnerabilityUpdateErrorParse (message: Message, err: Error) {
    log.error({ message, err }, 'error parsing vulnerability message');
    counters.vulnerability.labels('error_parse').inc();
};

export function dispatcherRunSuccess(run_id: string, status: 'success' | 'failure' | 'running' | 'timeout' | 'canceled') {
    log.info({ run_id, status }, `Dispatcher run created or updated with status: ${status}`);
    counters.dispatcherRun.labels('success', status).inc();
}

export function dispatcherRunError(run_id: string, status: string, err: Error) {
    log.error({ run_id, status, err }, 'error updating dispatcher run');
    counters.dispatcherRun.labels('error', status).inc();
};

export function dispatcherRunErrorParse(message: Message, err: Error, status = 'unknown') {
    log.error({ message, err }, 'error parsing dispatcher run message');
    counters.dispatcherRun.labels('error_parse', status).inc();
};
