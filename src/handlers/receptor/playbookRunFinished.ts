import log from '../../util/log';
import * as db from '../../db';
import * as _ from 'lodash';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import { PlaybookRunExecutor, PlaybookRunSystem, Status } from './models';
import * as Knex from 'knex';
import { updateExecutorById, updatePlaybookRun, findExecutorByReceptorIds } from './queries';

const INCOMPLETE_SYSTEM_STATUSES = [Status.PENDING, Status.RUNNING];

export interface PlaybookRunFinished extends SatReceptorResponse {
    playbook_run_id: string;
    host: string;
    status: 'success' | 'failure' | 'canceled';
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_finished').required(),
    playbook_run_id: Joi.string().guid().required(),
    host: Joi.string().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required()
});

async function countSystemsByStatus (knex: Knex, executorIds: string[]) {
    const data = await knex(PlaybookRunSystem.TABLE)
    .whereIn(PlaybookRunSystem.playbook_run_executor_id, executorIds)
    .groupBy(PlaybookRunSystem.status)
    .select('status')
    .count('id');

    return _(data).keyBy('status').mapValues(value => parseInt(value.count as string)).value();
}

function allFinished (stats: Record<string, number>) {
    return INCOMPLETE_SYSTEM_STATUSES.every(status => !_.has(stats, status));
}

function getFinalStatusForParent (stats: Record<string, number>) {
    if (_.has(stats, Status.FAILURE)) {
        return Status.FAILURE;
    } else if (_.has(stats, Status.CANCELED)) {
        return Status.CANCELED;
    }

    return Status.SUCCESS;
}

export async function handle (message: ReceptorMessage<PlaybookRunFinished>) {
    log.info({message}, 'received playbook_run_finished');

    const knex = db.get();

    const executor = await findExecutorByReceptorIds(knex, message.in_response_to, message.sender);

    if (!executor) {
        probes.noExecutorFound(message.payload.type, {job_id: message.in_response_to, node_id: message.sender});
        return;
    }

    // update the systems table
    await knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor.id)
    .whereIn(PlaybookRunSystem.status, [Status.PENDING, Status.RUNNING])
    .where(PlaybookRunSystem.system_name, message.payload.host)
    .update({
        [PlaybookRunSystem.status]: message.payload.status,
        [PlaybookRunSystem.updated_at]: knex.fn.now()
    });

    const perExecutorSystemStats = await countSystemsByStatus(knex, [executor.id]);
    if (!allFinished(perExecutorSystemStats)) {
        log.trace({stats: perExecutorSystemStats}, 'executor not finished yet');
        return;
    }

    // all systems for the executor reached the final status
    // it's time that we update the status of the executor
    await updateExecutorById(
        knex, executor.id, [Status.PENDING, Status.ACKED, Status.RUNNING], getFinalStatusForParent(perExecutorSystemStats));

    // it may also be that all systems across the entire playbook_run (i.e. across all executors) reached the final status
    // let's check if that's the case
    const executorsInRun = await knex(PlaybookRunExecutor.TABLE)
    .where(PlaybookRunExecutor.playbook_run_id, executor.playbook_run_id)
    .select(PlaybookRunExecutor.id);

    const perRunStats = await countSystemsByStatus(knex, executorsInRun.map(executor => executor.id));
    if (!allFinished(perRunStats)) {
        log.trace({stats: perRunStats}, 'run not finished yet');
        return;
    }

    // all systems across all playbook_run executors are in the final state
    // let's update the playbook_run.status
    await updatePlaybookRun(
        knex, executor.playbook_run_id, [Status.PENDING, Status.RUNNING], getFinalStatusForParent(perRunStats));
}
