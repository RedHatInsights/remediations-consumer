import advisorHandler from './handlers/advisor';
import complianceHandler from './handlers/compliance';
import inventoryHandler from './handlers/inventory';
import patchHandler from './handlers/patch';
import receptorHandler from './handlers/receptor';
import vulnerabilityHandler from './handlers/vulnerability';
import config from './config';

export function formatTopicDetails(): TopicConfig[] {
    return [{
        topic: config.kafka.topics.advisor.topic,
        handler: advisorHandler,
        resetOffsets: config.kafka.topics.advisor.resetOffsets
    }, {
        topic: config.kafka.topics.compliance.topic,
        handler: complianceHandler,
        resetOffsets: config.kafka.topics.compliance.resetOffsets
    }, {
        topic: config.kafka.topics.inventory.topic,
        handler: inventoryHandler,
        resetOffsets: config.kafka.topics.inventory.resetOffsets
    }, {
        topic: config.kafka.topics.patch.topic,
        handler: patchHandler,
        resetOffsets: config.kafka.topics.patch.resetOffsets
    }, {
        topic: config.kafka.topics.receptor.topic,
        handler: receptorHandler,
        resetOffsets: config.kafka.topics.receptor.resetOffsets
    }, {
        topic: config.kafka.topics.vulnerability.topic,
        handler: vulnerabilityHandler,
        resetOffsets: config.kafka.topics.vulnerability.resetOffsets
    }];
}

export interface TopicConfig {
    topic: string;
    handler: any;
    resetOffsets: boolean;
}
