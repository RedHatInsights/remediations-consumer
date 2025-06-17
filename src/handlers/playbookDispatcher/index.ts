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
    status: Joi.string().valid(...validStatuses).required(),
    labels: Joi.object({
        'playbook-run': Joi.string().optional()
    }).optional()
});

// Strongly typed interface for validated messages
interface DispatcherRunMessage {
    id: string;
    status: typeof validStatuses[number];
    remediations_run_id?: string;
}

function parseMessage(message: Message): DispatcherRunMessage | undefined {
    try {
        const parsed = parse(message);
        if (!parsed?.payload) {
            probes.dispatcherRunErrorParse(message, new Error('Message parse failed or payload missing'));
            return;
        }

        const validated = validate(parsed.payload, schema) as unknown as {
            id: string;
            status: string;
            labels?: { 'playbook-run'?: string };
        };

        if (!validated) {
            probes.dispatcherRunErrorParse(message, new Error('Schema validation failed'));
            return;
        }

        return {
            id: validated.id,
            status: validated.status as typeof validStatuses[number],
            remediations_run_id: validated.labels?.['playbook-run']
        };
    } catch (err) {
        if (err instanceof Error) {
            probes.dispatcherRunErrorParse(message, err);
        }
    }
}

export default async function onMessage(message: Message) {
    const eventType = message.headers?.event_type?.toString();
    if (eventType !== 'create' && eventType !== 'update') {
        return;
    }

    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    const { id, status, remediations_run_id } = parsed;

    if (eventType === 'create' && !remediations_run_id) {
        probes.dispatcherRunErrorParse(message, new Error("Missing 'playbook-run' label in create event"));
        return;
    }

    try {
        const result = await db.createOrUpdateDispatcherRun(db.get(), id, status, remediations_run_id);

        if (result === 'created') {
            probes.dispatcherRunCreateSuccess(id, status);
        } else {
            probes.dispatcherRunUpdateSuccess(id, status);
        }
    } catch (err) {
        if (err instanceof Error) {
            probes.dispatcherRunError(id, status, err);
        }
    }
}
