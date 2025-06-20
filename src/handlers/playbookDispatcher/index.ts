import * as Joi from '@hapi/joi';
import { Message } from 'kafkajs';
import * as _ from 'lodash';
import * as db from '../../db';
import * as probes from '../../probes';
import { parse, validate } from '../common';

// List of valid playbook run statuses
const validStatuses = ['success', 'failure', 'running', 'timeout', 'canceled'] as const;

const schema = Joi.object({
    id: Joi.string().required(),
    status: Joi.string().valid(...validStatuses).required()
});

function parseMessage(message: Message) {
    try {
        const parsed = parse(message);
        if (!parsed || !parsed.payload) {
            probes.playbookUpdateErrorParse(message, new Error('Message parse failed or payload missing'));
            return;
        }

        const validated = validate(parsed.payload, schema);
        if (!validated) {
            probes.playbookUpdateErrorParse(message, new Error('Schema validation failed'));
            return;
        }
        return validated;
    } catch (err) {
        if (err instanceof Error) {
            probes.playbookUpdateErrorParse(message, err);
        }
    }
}

export default async function onMessage(message: Message) {
    const eventType = message.headers?.event_type?.toString();

    // Only handle 'update' and 'create' events; ignore delete', and 'read' events
    // 'delete' and 'read' are irrelevant for status updates
    if (eventType === 'create' || eventType === 'update') {
        const knex = db.get();
        const parsed = parseMessage(message) as { id: string; status: string };

        if (parsed) {
            const { id, status } = parsed;

            try {
                // Attempt to update the playbook run status in the database
                const updatedRows = await db.updatePlaybookRunStatus(knex, id, status);

                if (updatedRows === 0) {
                    // If no rows were updated, the playbook run ID wasn't found
                    probes.playbookRunUnknown(id, status);
                } else {
                    if (eventType === 'create') {
                        probes.playbookCreateSuccess(id, status as typeof validStatuses[number]);
                    } else {
                        probes.playbookUpdateSuccess(id, status as typeof validStatuses[number]);
                    }
                }
            } catch (err) {
                if (err instanceof Error) {
                    probes.playbookUpdateError(id, status, err);
                }
            }
        }
    }
}
