'use strict';

const convict = require('convict');

const config = convict({
    env: {
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    commit: {
        format: String,
        default: undefined,
        env: 'OPENSHIFT_BUILD_COMMIT'
    },
    logging: {
        level: {
            format: String,
            default: 'trace',
            env: 'LOG_LEVEL'
        },
        pretty: {
            format: Boolean,
            default: false,
            env: 'LOG_PRETTY'
        }
    },
    kafka: {
        host: {
            format: String,
            default: 'localhost:9092',
            env: 'KAFKA_HOST'
        },
        autoCommit: {
            format: Boolean,
            default: false,
            env: 'KAFKA_AUTOCOMMIT'
        },
        topics: {
            inventory: {
                topic: {
                    format: String,
                    default: 'platform.inventory.events',
                    env: 'INVENTORY_TOPIC'
                },
                consumerGroup: {
                    format: String,
                    default: 'remediations-consumer',
                    env: 'INVENTORY_CONSUMER_GROUP'
                }
            }
        }
    }
});

config.validate();

module.exports = config;
