import * as db from '../../db';
import log from '../../util/log';
import * as Joi from '@hapi/joi';
import * as probes from '../../probes';
import { Message } from 'kafkajs';
import config from '../../config';
import { validate, parse } from '../common';

interface RemoveMessage {
    id: string;
    type: string;
}

interface FactNamespace {
    namespace: string;
    facts: Record<string, unknown>;
}

interface UpdateMessage {
    type: 'updated';
    host: {
        id: string;
        display_name?: string;
        ansible_host?: string;
        fqdn?: string;
        facts?: FactNamespace[];
        system_profile?: {
            owner_id?: string;
        };
    };
}

const removeSchema = Joi.object().keys({
    id: Joi.string().required(),
    type: Joi.string().required()
});

const updateMessageSchema = Joi.object().keys({
    type: Joi.string().valid('updated').required(),
    host: Joi.object().keys({
        id: Joi.string().uuid().required(),
        display_name: Joi.string().allow(null).optional(),
        ansible_host: Joi.string().allow(null).optional(),
        fqdn: Joi.string().allow(null).optional(),
        facts: Joi.array().items(
            Joi.object().keys({
                namespace: Joi.string().required(),
                facts: Joi.object().unknown(true).required()
            })
        ).optional(),
        system_profile: Joi.object().keys({
            owner_id: Joi.string().allow(null).optional()
        }).unknown(true).optional()
    }).required()
});

const DELETE_EVENT_TYPE = 'delete';
const UPDATE_EVENT_TYPE = 'updated';

function parseMessage (message: Message): RemoveMessage | UpdateMessage | undefined {
    try {
        const parsed = parse(message);

        if (!parsed) {
            log.debug(message, 'ignoring message - no parsed content');
            return;
        }

        if (parsed.type === DELETE_EVENT_TYPE) {
            return validate(parsed, removeSchema);
        } else if (parsed.type === UPDATE_EVENT_TYPE) {
            return validate(parsed, updateMessageSchema);
        } else {
            log.debug(message, `ignoring message - unsupported event type: ${parsed.type}`);
            return;
        }
    } catch (e) {
        if (e instanceof Error) {
            probes.inventoryErrorParse(message, e);
        }
    }
}

async function handleDeleteEvent(message: RemoveMessage) {
    const { id } = message;

    try {
        const result = await db.deleteSystem(id, config.db.dryRun);
        if (result > 0) {
            if (config.db.dryRun) {
                log.info({ id, references: result }, 'host would be removed (dry run)');
            } else {
                probes.inventoryRemoveSuccess(id, result);
            }
        } else {
            probes.inventoryRemoveUnknown(id);
        }
    } catch (e) {
        if (e instanceof Error) {
            probes.inventoryRemoveError(id, e);
        }
    }
}

async function handleUpdateEvent(event: UpdateMessage) {
    const { host } = event;
    
    try {
        const knex = db.get();
        
        // Only update if system exists in our table (part of a remediation plan)
        const existingSystem = await knex('systems').where({ id: host.id }).first();
        if (!existingSystem) {
            log.debug({ systemId: host.id }, 'ignoring update for unknown system');
            return;
        }
        
        // Field mapping from inventory message to systems table:
        // - fqdn: hostname (DNS identity)
        // - display_name: display_name (human-friendly name)
        // - ansible_host: ansible_hostname (connectivity address)
        // - facts[namespace=satellite].facts.organization_id: satellite_org_id
        // - system_profile.owner_id: owner_id
        const satelliteFacts = host.facts?.find(f => f.namespace === 'satellite');
        const satelliteOrgId = satelliteFacts?.facts?.organization_id as string | undefined;
        const ownerId = host.system_profile?.owner_id;

        await db.updateSystem(
            knex,
            host.id,
            host.fqdn,
            host.display_name,
            host.ansible_host,
            satelliteOrgId,
            ownerId
        );

        probes.inventoryUpdateSuccess(host.id);
        
    } catch (e) {
        if (e instanceof Error) {
            probes.inventoryUpdateError(host.id, e);
        }
    }
}

export default async function onMessage (message: Message) {
    const parsed = parseMessage(message);
    if (!parsed) {
        return;
    }

    if (parsed.type === DELETE_EVENT_TYPE) {
        await handleDeleteEvent(parsed as RemoveMessage);
    } else if (parsed.type === UPDATE_EVENT_TYPE) {
        await handleUpdateEvent(parsed as UpdateMessage);
    }
}
