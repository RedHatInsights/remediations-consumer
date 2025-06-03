import * as Joi from '@hapi/joi';
import { Message } from 'kafkajs';
import * as _ from 'lodash';
import * as db from '../../db';
import * as probes from '../../probes';
import { parse, validate } from '../common';

const schema = Joi.object({
    id: Joi.string().required(),
    status: Joi.string().required()
});

// List of valid playbook run statuses
const validStatuses = ['success', 'failure', 'running', 'timeout', 'canceled'] as const;

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

    // Only handle 'update' events; ignore 'create', 'delete', and 'read' events
    // 'create' is handled separately when playbook run is initially created because the status is always 'running'
    // 'delete' and 'read' are irrelevant for status updates
    if (eventType === 'update') {
        const knex = db.get();
        const parsed = parseMessage(message) as { id: string; status: string };

        if (parsed) {
            const { id, status } = parsed;

            // Check if the parsed status is valid (e.g., 'success', 'failure', etc.)
            const statusIsValid = validStatuses.includes(status as any);
            if (!statusIsValid) {
                // If status is invalid, record the error and exit
                probes.playbookUpdateErrorParse(message, new Error(`Invalid status value: ${status}`), status);
                return;
            }

            try {
                // Attempt to update the playbook run status in the database
                const updatedRows = await db.updatePlaybookRunStatus(knex, id, status);

                if (updatedRows === 0) {
                    // If no rows were updated, the playbook run ID wasn't found
                    probes.playbookRunUnknown(id, status);
                } else {
                    probes.playbookUpdateSuccess(id, status as typeof validStatuses[number]);
                }
            } catch (err) {
                if (err instanceof Error) {
                    probes.playbookUpdateError(id, status, err);
                }
            }
        }
    }
}
