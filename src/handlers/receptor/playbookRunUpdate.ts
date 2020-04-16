import log from '../../util/log';
import * as _ from 'lodash';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import * as probes from '../../probes';
import { Status } from './models';
import {updateExecutorById, updatePlaybookRun, findExecutorByReceptorIds, updateSystemFull, updateSystemDiff, updateSystemMissing} from './queries';

const ACTIONABLE_STATUSES = [Status.PENDING, Status.ACKED];
const MISSING_LOGS = '\n\u2026\n';

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

    if (executor.text_update_full) {
        // Full mode
        await updateSystemFull(knex, executor.id, message);
    } else {
        // Diff mode
        const firstAttempt = await updateSystemDiff(knex, executor.id, message, message.payload.console);
        
        if (firstAttempt !== 1) {
            const secondAttempt = await updateSystemMissing(knex, executor.id, message, message.payload.console, MISSING_LOGS);

            if (secondAttempt === 1) {
                probes.lostUpdateMessage(message);
            }
        }
    }

    if (!ACTIONABLE_STATUSES.includes(executor.status)) {
        return;
    }

    await updateExecutorById(knex, executor.id, [Status.PENDING, Status.ACKED], Status.RUNNING);
    await updatePlaybookRun(knex, executor.playbook_run_id, [Status.PENDING], Status.RUNNING);
}
