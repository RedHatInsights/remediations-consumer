import * as Knex from 'knex';
import { PlaybookRunExecutor, Status, PlaybookRun } from './models';

export function updateExecutorByReceptorIds (
    knex: Knex, jobId: string, nodeId: string, expectedStatus: Status, targetStatus: Status
) {
    return knex(PlaybookRunExecutor.TABLE)
    .where(PlaybookRunExecutor.receptor_job_id, jobId)
    .where(PlaybookRunExecutor.receptor_node_id, nodeId)
    .where(PlaybookRunExecutor.status, expectedStatus)
    .update({
        [PlaybookRunExecutor.status]: targetStatus,
        [PlaybookRunExecutor.updated_at]: knex.fn.now()
    });
}

export function updateExecutorById (knex: Knex, id: string, expectedStatuses: Status[], targetStatus: Status) {
    return knex(PlaybookRunExecutor.TABLE)
    .where(PlaybookRunExecutor.id, id)
    .whereIn(PlaybookRunExecutor.status, expectedStatuses)
    .update({
        [PlaybookRunExecutor.status]: targetStatus,
        [PlaybookRunExecutor.updated_at]: knex.fn.now()
    });
}

export function updatePlaybookRun (knex: Knex, id: string, expectedStatuses: Status[], targetStatus: Status) {
    return knex(PlaybookRun.TABLE)
    .where(PlaybookRun.id, id)
    .whereIn(PlaybookRun.status, expectedStatuses)
    .update({
        [PlaybookRun.status]: targetStatus,
        [PlaybookRun.updated_at]: knex.fn.now()
    });
}

export function findExecutorByReceptorIds (knex: Knex, jobId: string, nodeId: string) {
    return knex(PlaybookRunExecutor.TABLE)
    .select([PlaybookRunExecutor.id, PlaybookRunExecutor.playbook_run_id, PlaybookRunExecutor.status])
    .where(PlaybookRunExecutor.receptor_job_id, jobId)
    .where(PlaybookRunExecutor.receptor_node_id, nodeId)
    .first();
}
