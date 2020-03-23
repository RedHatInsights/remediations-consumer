import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import { Status } from './models';
import { updateExecutorByReceptorIds } from './queries';

export interface PlaybookRunAck extends SatReceptorResponse {
    playbook_run_id: string;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

export async function handle (message: ReceptorMessage<PlaybookRunAck>) {
    log.info({message}, 'received playbook_run_ack');

    const knex = db.get();

    const executors = await updateExecutorByReceptorIds(
        knex, message.in_response_to, message.sender, Status.PENDING, Status.ACKED);

    if (executors === 0) {
        log.warn({job_id: message.in_response_to}, 'no executor matched');
        return;
    }
}
