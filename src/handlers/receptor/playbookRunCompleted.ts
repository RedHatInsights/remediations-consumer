import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as assert from 'assert';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import * as probes from '../../probes';
import * as Knex from 'knex';
import { Status } from '../models';
import { findExecutorByReceptorIds, updateExecutorById } from './queries';
import { tryUpdateRun } from './playbookRunFinished';

const initialStatuses = [ Status.ACKED, Status.PENDING, Status.RUNNING ];

export interface PlaybookRunCompleted extends SatReceptorResponse {
    playbook_run_id: string;
    status: string;
    version: number;
    satellite_connection_code: 0 | 1 | null;
    satellite_connection_error: string | null;
    satellite_infrastructure_code: 0 | 1 | null;
    satellite_infrastructure_error: string | null;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_completed').required(),
    playbook_run_id: Joi.string().guid().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required(),
    version: Joi.number().required(),
    satellite_connection_code: Joi.number().allow(null).required(),
    satellite_connection_error: Joi.string().allow(null).required(),
    satellite_infrastructure_code: Joi.number().allow(null).required(),
    satellite_infrastructure_error: Joi.string().allow(null).required()
});

function tryUpdateExecutor (
        knex: Knex,
        executor_id: string,
        status: string,
        sat_connection_code: 0 | 1 | null = null,
        sat_connection_error: string | null = null,
        sat_infrastructure_code: 0 | 1 | null = null,
        sat_infrastructure_error: string | null = null
    ){
    switch (status) {
        case Status.SUCCESS: {
            return updateExecutorById(
                knex,
                executor_id,
                initialStatuses,
                Status.SUCCESS,
                sat_connection_code,
                sat_connection_error,
                sat_infrastructure_code,
                sat_infrastructure_error);
        }

        case Status.FAILURE: {
            return updateExecutorById(
                knex,
                executor_id,
                initialStatuses,
                Status.FAILURE,
                sat_connection_code,
                sat_connection_error,
                sat_infrastructure_code,
                sat_infrastructure_error);
        }

        case Status.CANCELED: {
            return updateExecutorById(knex,
                executor_id,
                initialStatuses,
                Status.CANCELED,
                sat_connection_code,
                sat_connection_error,
                sat_infrastructure_code,
                sat_infrastructure_error);
        }

        default: {
            log.debug({executor_id}, 'playbook_run_completed payload status was not a "finished" status');
            return;
        }
    }
}

export async function handle (message: ReceptorMessage<PlaybookRunCompleted>) {
    log.debug({message}, 'received playbook_run_completed');

    const knex = db.get();

    const executor = await findExecutorByReceptorIds(knex, message.in_response_to, message.sender);

    if (!executor) {
        probes.noExecutorFound(message.payload.type, {job_id: message.in_response_to, node_id: message.sender});
        return;
    }

    const executorUpdated = await tryUpdateExecutor(
        knex,
        executor.id,
        message.payload.status,
        message.payload.satellite_connection_code,
        message.payload.satellite_connection_error,
        message.payload.satellite_infrastructure_code,
        message.payload.satellite_infrastructure_error
    );
    if (!executorUpdated) {
        log.debug('executor failed to update');
        return;
    }

    assert.equal(executorUpdated, 1); // This should never be greater than one but just in case
    log.info({id: executor.id, status: message.payload.status }, 'executor finished');

    const runUpdated = await tryUpdateRun(knex, executor.playbook_run_id);
    if (!runUpdated.length) {
        log.debug('run not finished yet');
        return;
    }

    assert.equal(runUpdated.length, 1); // it should never happen that this updates more than one row but just in case
    log.info({id: runUpdated[0].id, status: runUpdated[0].status }, 'run finished');
}