import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import * as db from '../../db';
import * as P from 'bluebird';
import * as _ from 'lodash';
import { Message } from 'kafka-node';
import { validate, parse } from '../common';

interface AdvisorUpdate {
    host_id: string;
    issues: Array<string>;
}

const schema = Joi.object().keys({
    host_id: Joi.string().required(),
    issues: Joi.array().items(Joi.string()).required()
});

function parseMessage (message: Message): AdvisorUpdate | undefined {
    try {
        const parsed = parse(message);

        if (!parsed) {
            return;
        }

        return validate(parsed, schema);
    } catch (e) {
        probes.advisorUpdateErrorParse(message, e);
    }
}

export default async function onMessage (message: Message) {
    const knex = db.get();
    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    const { host_id, issues } = parsed;

    for (const issue of issues) {
        try {
            const searchResult = await db.findHostIssue(knex, host_id, issue);

            if (searchResult.length > 0) {
                const updateResult = await db.updateIssue(knex, host_id, searchResult[0].id);
                probes.advisorUpdateSuccess(host_id, issue, updateResult);
            } else {
                probes.advisorUpdateUnknown(host_id, issue);
            }
        } catch (e) {
            probes.advisorUpdateError(host_id, issue, e);
        }
    }
}
