'use strict';

import * as _ from 'lodash';
import inventoryHandler from './handlers/inventory';
import receptorHandler from './handlers/receptor';
import config from './config';

export function formatTopicDetails () {
    const topicDetails = [
        {
            topic: config.kafka.topics.inventory.topic,
            handler: inventoryHandler,
            concurrency: config.kafka.topics.inventory.concurrency
        },
        {
            topic: config.kafka.topics.receptor.topic,
            handler: receptorHandler,
            concurrency: config.kafka.topics.receptor.concurrency
        }
    ];

    return topicDetails;
}
