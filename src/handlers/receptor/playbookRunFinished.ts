import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';

export interface PlaybookRunFinished extends SatReceptorResponse {
    playbook_run_id: string;
    host: string;
    status: string;
}

export const schema = Joi.object().keys({
    type: Joi.string().valid('playbook_run_finished').required(),
    playbook_run_id: Joi.string().guid().required(),
    host: Joi.string().required(),
    status: Joi.string().valid('success', 'failure', 'canceled').required()
});

export async function handle (message: ReceptorMessage<PlaybookRunFinished>) {
    log.info({message}, 'received playbook_run_finished');
}
