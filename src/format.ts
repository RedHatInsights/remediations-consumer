import advisorHandler from './handlers/advisor';
import complianceHandler from './handlers/compliance';
import inventoryHandler from './handlers/inventory';
import patchHandler from './handlers/patch';
import receptorHandler from './handlers/receptor';
import vulnerabilityHandler from './handlers/vulnerability';
import config from './config';

export function formatTopicDetails(): TopicConfig[] {
    return [{
        topic: config.kafka.topics.inventory.topic,
        handler: inventoryHandler,
        resetOffsets: config.kafka.topics.inventory.resetOffsets
    }, {
        topic: config.kafka.topics.receptor.topic,
        handler: receptorHandler,
        resetOffsets: config.kafka.topics.receptor.resetOffsets
    }];
}

export interface TopicConfig {
    topic: string;
    handler: any;
    resetOffsets: boolean;
}
