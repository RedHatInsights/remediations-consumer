import * as convict from 'convict';
import formats from './formats';

convict.addFormats(formats);

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
        },
        dryRun: {
            format: Boolean,
            default: false,
            env: 'DB_DRY_RUN'
        },
        pool: {
            min: {
                format: 'nat',
                default: 2,
                env: 'DB_POOL_MIN'
            },
            max: {
                format: 'nat',
                default: 5,
                env: 'DB_POOL_MAX'
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
        logging: {
            format: Boolean,
            default: false,
            env: 'KAFKA_LOGGING'
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
                },
                concurrency: {
                    format: 'nat',
                    default: 1,
                    env: 'INVENTORY_CONCURRENCY'
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
            format: 'nat',
            default: 9006,
            env: 'METRICS_PORT'
        }
    }
});

config.validate({ strict: true });

export default config.get();
export const sanitized = config.toString();
