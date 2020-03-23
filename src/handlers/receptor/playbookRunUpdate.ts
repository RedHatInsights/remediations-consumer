import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import { Status, PlaybookRunExecutor, PlaybookRun, PlaybookRunSystem } from './models';

const LT = '<';

/*
 * This is an optimization. Only the first playbook_run_update message for a given executor/run should be updating
 * the status (subsequent updates would have no effect). Therefore, if the sequence is higher than the threshold we
 * can be pretty sure the status has already been updated and therefore we do not need to issue the UPDATE statements
 * for executor/run anymore.
 */
const PARENT_UPDATE_THRESHOLD = 5;

export interface PlaybookRunUpdate extends SatReceptorResponse {
    playbook_run_id: string;
    sequence: number;
    host: string;
    console: string;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_update').required(),
    playbook_run_id: Joi.string().guid().required(),
    sequence: Joi.number().required(),
    host: Joi.string().required(),
    console: Joi.string().required()
});

export async function handle (message: ReceptorMessage<PlaybookRunUpdate>) {
    log.info({message}, 'received playbook_run_update');

    const knex = db.get();

    const executors = await knex(PlaybookRunExecutor.TABLE)
    .select([PlaybookRunExecutor.id, PlaybookRunExecutor.playbook_run_id])
    .where(PlaybookRunExecutor.receptor_job_id, message.in_response_to)
    .where(PlaybookRunExecutor.receptor_node_id, message.sender);

    if (executors.length > 1) {
        throw new Error(`multiple executors matched ${message.in_response_to}`);
    } else if (executors.length === 0) {
        log.warn({job_id: message.in_response_to}, 'no executor matched');
        return;
    }

    const executor = executors[0];

    if (message.payload.sequence < PARENT_UPDATE_THRESHOLD) {
        await knex(PlaybookRunExecutor.TABLE)
        .where(PlaybookRunExecutor.id, executor.id)
        .whereIn(PlaybookRunExecutor.status, [Status.PENDING, Status.ACKED])
        .update({
            [PlaybookRunExecutor.status]: Status.RUNNING,
            [PlaybookRunExecutor.updated_at]: knex.fn.now()
        });

        await knex(PlaybookRun.TABLE)
        .where(PlaybookRun.id, executor.playbook_run_id)
        .where(PlaybookRun.status, Status.PENDING)
        .update({
            [PlaybookRun.status]: Status.RUNNING,
            [PlaybookRun.updated_at]: knex.fn.now()
        });
    }

    // update the system table
    await knex(PlaybookRunSystem.TABLE)
    .where(PlaybookRunSystem.playbook_run_executor_id, executor.id)
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
