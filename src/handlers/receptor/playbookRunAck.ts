import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';

export interface PlaybookRunAck extends SatReceptorResponse {
    playbook_run_id: string;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_ack').required(),
    playbook_run_id: Joi.string().guid().required()
});

export async function handle (message: ReceptorMessage<PlaybookRunAck>) {
    log.info({message}, 'received playbook_run_ack');
}
