import log from '../../util/log';
import {SatReceptorResponse, ReceptorMessage} from '.';
import * as Joi from '@hapi/joi';

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
}
