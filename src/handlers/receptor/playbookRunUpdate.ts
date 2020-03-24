import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import * as probes from '../../probes';
import { Status, PlaybookRunSystem } from './models';
import { updateExecutorById, updatePlaybookRun, findExecutorByReceptorIds } from './queries';

const LT = '<';

const ACTIONABLE_STATUSES = [Status.PENDING, Status.ACKED];

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

    const executor = await findExecutorByReceptorIds(knex, message.in_response_to, message.sender);

    if (!executor) {
        probes.noExecutorFound(message.payload.type, {job_id: message.in_response_to, node_id: message.sender});
        return;
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

    if (!ACTIONABLE_STATUSES.includes(executor.status)) {
        return;
    }

    await updateExecutorById(knex, executor.id, [Status.PENDING, Status.ACKED], Status.RUNNING);
    await updatePlaybookRun(knex, executor.playbook_run_id, [Status.PENDING], Status.RUNNING);
}
