import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import * as db from '../../db';
import * as _ from 'lodash';
import { Message } from 'kafkajs';
import { validate, parse } from '../common';

const ADVISOR_PREFIX = 'advisor%';

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
    try {
        const pastIssues = await db.findHostIssues(knex, host_id);

        if (_.isEmpty(pastIssues)) {
            probes.advisorHostUnknown(host_id);
            return;
        }

        const result = await db.updateIssues(knex, host_id, issues, ADVISOR_PREFIX);

        if (!_.isEmpty(result)) {
            probes.advisorIssueUnknown(host_id, issues);
        }
        probes.advisorUpdateSuccess(host_id, issues, 2); // TODO: Fix Probes
    } catch (e) {
        probes.advisorUpdateError(host_id, issues, e);
    }
}
