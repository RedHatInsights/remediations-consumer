import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';

export interface PlaybookRunCancelAck extends SatReceptorResponse {
    playbook_run_id: string;
    status: string;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_cancel_ack').required(),
    playbook_run_id: Joi.string().guid().required(),
    status: Joi.string().required()
});

export async function handle (message: ReceptorMessage<PlaybookRunCancelAck>) {
    log.info({message}, 'received playbook_run_cancel_ack');
}
