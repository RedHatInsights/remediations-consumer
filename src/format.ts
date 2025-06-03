import advisorHandler from './handlers/advisor';
import complianceHandler from './handlers/compliance';
import inventoryHandler from './handlers/inventory';
import patchHandler from './handlers/patch';
import receptorHandler from './handlers/receptor';
import vulnerabilityHandler from './handlers/vulnerability';
import playbookDispatcherHandler from './handlers/playbookDispatcher';
import config from './config';

export function formatTopicDetails(): TopicConfig[] {
    return [{
        enabled: config.kafka.topics.inventory.enabled,
        topic: config.kafka.topics.inventory.topic,
        handler: inventoryHandler,
        resetOffsets: config.kafka.topics.inventory.resetOffsets
    }, {
        enabled: config.kafka.topics.advisor.enabled,
        topic: config.kafka.topics.advisor.topic,
        handler: advisorHandler,
        resetOffsets: config.kafka.topics.advisor.resetOffsets
    }, {
        enabled: config.kafka.topics.compliance.enabled,
        topic: config.kafka.topics.compliance.topic,
        handler: complianceHandler,
        resetOffsets: config.kafka.topics.compliance.resetOffsets
    }, {
        enabled: config.kafka.topics.patch.enabled,
        topic: config.kafka.topics.patch.topic,
        handler: patchHandler,
        resetOffsets: config.kafka.topics.patch.resetOffsets
    }, {
        enabled: config.kafka.topics.vulnerability.enabled,
        topic: config.kafka.topics.vulnerability.topic,
        handler: vulnerabilityHandler,
        resetOffsets: config.kafka.topics.vulnerability.resetOffsets
    },{
        enabled: config.kafka.topics.playbookDispatcher.enabled,
        topic: config.kafka.topics.playbookDispatcher.topic,
        handler: playbookDispatcherHandler,
        resetOffsets: config.kafka.topics.playbookDispatcher.resetOffsets
    }];
}

export interface TopicConfig {
    enabled: boolean;
    topic: string;
    handler: any;
    resetOffsets: boolean;
}
