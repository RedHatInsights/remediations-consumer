'use strict';

const convict = require('convict');
const fs = require('fs');

convict.addFormat({
    name: 'file',
    validate (path) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.existsSync(path);
    },
    coerce (path) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.readFileSync(path, 'utf8');
    }
});

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

    db: {
        connection: {
            user: {
                format: String,
                default: 'postgres',
                env: 'DB_USERNAME'
            },
            password: {
                format: String,
                default: 'remediations',
                env: 'DB_PASSWORD',
                sensitive: true
            },
            database: {
                format: String,
                default: 'remediations_consumer_test',
                env: 'DB_DATABASE'
            },
            host: {
                format: String,
                default: '127.0.0.1',
                env: 'DB_HOST'
            },
            ssl: {
                ca: {
                    format: 'file',
                    default: undefined,
                    env: 'DB_CA',
                    sensitive: true
                }
            }
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
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'INVENTORY_RESET_OFFSETS'
                }
            }
        }
    },

    metrics: {
        prefix: {
            format: String,
            default: 'remediations_consumer_',
            env: 'METRICS_PREFIX'
        },
        port: {
            format: Number,
            default: 9006,
            env: 'METRICS_PORT'
        }
    }
});

config.validate();

module.exports = config;
