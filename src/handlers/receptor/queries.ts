import { Knex }from 'knex';
import { PlaybookRunExecutor, PlaybookRunSystem, Status, PlaybookRun } from '../models';
import { ReceptorMessage } from '.';
import { PlaybookRunUpdate } from './playbookRunUpdate';

const LT = '<';

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

export function updateExecutorById (
    knex: Knex,
    id: string,
    expectedStatuses: Status[],
    targetStatus: Status,
    sat_connection_code: 1 | 0 | null = null,
    sat_connection_error: string | null = null,
    sat_infrastructure_code: 1 | 0 | null = null,
    sat_infrastructure_error: string | null = null
    ) {
        return knex(PlaybookRunExecutor.TABLE)
        .where(PlaybookRunExecutor.id, id)
        .whereIn(PlaybookRunExecutor.status, expectedStatuses)
        .update({
            [PlaybookRunExecutor.status]: targetStatus,
            [PlaybookRunExecutor.updated_at]: knex.fn.now(),
            [PlaybookRunExecutor.satellite_connection_code]: sat_connection_code,
            [PlaybookRunExecutor.satellite_connection_error]: sat_connection_error,
            [PlaybookRunExecutor.satellite_infrastructure_code]: sat_infrastructure_code,
            [PlaybookRunExecutor.satellite_infrastructure_error]: sat_infrastructure_error
        }
    );
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

export function updateSystemFull (knex: Knex, executor_id: string, message: ReceptorMessage<PlaybookRunUpdate>) {

    return knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor_id)
    .whereIn(PlaybookRunSystem.status, [Status.PENDING, Status.RUNNING])
    .where(PlaybookRunSystem.system_name, message.payload.host)
    .where(PlaybookRunSystem.sequence, LT, message.payload.sequence)
    .update({
        [PlaybookRunSystem.status]: Status.RUNNING,
        [PlaybookRunSystem.updated_at]: knex.fn.now(),
        [PlaybookRunSystem.sequence]: message.payload.sequence,
        [PlaybookRunSystem.console]: message.payload.console
    });
}

export function updateSystemMissing (knex: Knex, executor_id: string, message: ReceptorMessage<PlaybookRunUpdate>, missingLogs: string) {
    return knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor_id)
    .whereIn(PlaybookRunSystem.status, [Status.PENDING, Status.RUNNING])
    .where(PlaybookRunSystem.system_name, message.payload.host)
    .where(PlaybookRunSystem.sequence, LT, message.payload.sequence)
    .update({
        [PlaybookRunSystem.status]: Status.RUNNING,
        [PlaybookRunSystem.updated_at]: knex.fn.now(),
        [PlaybookRunSystem.sequence]: message.payload.sequence,
        [PlaybookRunSystem.console]: knex.raw(
            `"console" || REPEAT(?, (? - "sequence" - 1)) || ?`,
            [missingLogs, message.payload.sequence, message.payload.console]
        )
    });
}

export function updateSystemDiff (knex: Knex, executor_id: string, message: ReceptorMessage<PlaybookRunUpdate>) {
    return knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor_id)
    .whereIn(PlaybookRunSystem.status, [Status.PENDING, Status.RUNNING])
    .where(PlaybookRunSystem.system_name, message.payload.host)
    .where(PlaybookRunSystem.sequence, message.payload.sequence - 1)
    .update({
        [PlaybookRunSystem.status]: Status.RUNNING,
        [PlaybookRunSystem.updated_at]: knex.fn.now(),
        [PlaybookRunSystem.sequence]: message.payload.sequence,
        [PlaybookRunSystem.console]: knex.raw('"console" || ?', [message.payload.console])
    });
}

export function findExecutorByReceptorIds (knex: Knex, jobId: string, nodeId: string) {
    return knex(PlaybookRunExecutor.TABLE)
    .select([PlaybookRunExecutor.id, PlaybookRunExecutor.playbook_run_id, PlaybookRunExecutor.status, PlaybookRunExecutor.text_update_full])
    .where(PlaybookRunExecutor.receptor_job_id, jobId)
    .where(PlaybookRunExecutor.receptor_node_id, nodeId)
    .first();
}
