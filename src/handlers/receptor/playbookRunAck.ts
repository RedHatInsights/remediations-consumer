import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';
import * as db from '../../db';
import { Status, PlaybookRunExecutor } from './models';


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

    // Move this code to db once all implementations are in
    const executors = await knex(PlaybookRunExecutor.TABLE)
    .where(PlaybookRunExecutor.receptor_job_id, message.in_response_to)
    .where(PlaybookRunExecutor.receptor_node_id, message.sender)
    .where(PlaybookRunExecutor.status, Status.PENDING)
    .update({
        [PlaybookRunExecutor.status]: Status.ACKED,
        [PlaybookRunExecutor.updated_at]: knex.fn.now()
    });

    if (executors === 0) {
            log.warn({job_id: message.in_response_to}, 'no executor matched');
            return;
        }
}
