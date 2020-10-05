import log from '../../util/log';
import * as assert from 'assert';
import * as db from '../../db';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import { PlaybookRunExecutor, PlaybookRunSystem, Status, PlaybookRun } from '../models';
import * as Knex from 'knex';
import { findExecutorByReceptorIds } from './queries';
import {
    whereUnfinishedExecutorsWithFinishedSystems,
    updateStatusExecutors,
    updateStatusRuns,
    whereUnfinishedRunsWithFinishedExecutors
} from './sharedQueries';

export interface PlaybookRunFinished extends SatReceptorResponse {
    playbook_run_id: string;
    host: string;
    status: 'success' | 'failure' | 'canceled';
    version?: number
    connection_code?: 0 | 1 | null
    execution_code?: number | null
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_finished').required(),
    playbook_run_id: Joi.string().guid().required(),
    host: Joi.string().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required(),
    version: Joi.number().integer(),
    connection_code: Joi.number().integer().valid(0, 1, null),
    execution_code: Joi.number().integer().allow(null)
});

function tryUpdateExecutor (knex: Knex, id: string, connection_code: any = null, execution_code: any = null) {
    const query = whereUnfinishedExecutorsWithFinishedSystems(knex)
    .where(PlaybookRunExecutor.id, id);

    return updateStatusExecutors(knex, query, connection_code, execution_code);
}

export function tryUpdateRun (knex: Knex, id: string) {
    const query = whereUnfinishedRunsWithFinishedExecutors(knex)
    .where(PlaybookRun.id, id);

    return updateStatusRuns(knex, query);
}

export async function handle (message: ReceptorMessage<PlaybookRunFinished>) {
    log.debug({message}, 'received playbook_run_finished');

    const knex = db.get();

    const executor = await findExecutorByReceptorIds(knex, message.in_response_to, message.sender);

    if (!executor) {
        probes.noExecutorFound(message.payload.type, {job_id: message.in_response_to, node_id: message.sender});
        return;
    }

    // update the systems status
    await knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor.id)
    .whereIn(PlaybookRunSystem.status, [Status.PENDING, Status.RUNNING])
    .where(PlaybookRunSystem.system_name, message.payload.host)
    .update({
        [PlaybookRunSystem.status]: message.payload.status,
        [PlaybookRunSystem.updated_at]: knex.fn.now(),
        [PlaybookRunSystem.connection_code]: message.payload.connection_code,
        [PlaybookRunSystem.execution_code]: message.payload.execution_code
    });

    if (!message.payload.version) { // if the message is NOT a v2 satellite message use v1 update logic for playbook run
        const executorUpdated = await tryUpdateExecutor(knex, executor.id, message.payload.connection_code, message.payload.execution_code);
        if (!executorUpdated.length) {
            log.debug('executor not finished yet');
            return;
        }
    
        assert.equal(executorUpdated.length, 1); // it should never happen that this updates more than one row but just in case
        log.info({id: executorUpdated[0].id, status: executorUpdated[0].status }, 'executor finished');
    }

    const runUpdated = await tryUpdateRun(knex, executor.playbook_run_id);
    if (!runUpdated.length) {
        log.debug('run not finished yet');
        return;
    }

    assert.equal(runUpdated.length, 1); // it should never happen that this updates more than one row but just in case
    log.info({id: runUpdated[0].id, status: runUpdated[0].status }, 'run finished');
}
