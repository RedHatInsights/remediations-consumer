import * as convict from 'convict';
import * as _ from 'lodash';
import * as process from 'process';
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
        },
        cloudwatch: {
            enabled: {
                format: Boolean,
                default: false,
                env: 'LOG_CW_ENABLED'
            },
            level: {
                format: String,
                default: 'debug',
                env: 'LOG_CW_LEVEL'
            },
            group: {
                format: String,
                default: 'remediations-local',
                env: 'LOG_CW_GROUP'
            },
            prefix: {
                format: String,
                default: 'remediations-consumer',
                env: 'LOG_CW_PREFIX'
            },
            interval: {
                format: Number,
                default: 1000,
                env: 'LOG_CW_INTERVAL'
            },
            key: {
                format: String,
                default: undefined,
                env: 'LOG_CW_KEY'
            },
            secret: {
                format: String,
                default: undefined,
                env: 'LOG_CW_SECRET',
                sensitive: true
            },
            region: {
                format: String,
                default: 'us-east-1',
                env: 'LOG_CW_REGION'
            }
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
            port: {
                format: Number,
                default: 5432,
                env: 'DB_PORT'
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
        },
        ssl: {
            enabled: {
                format: Boolean,
                default: true,
                env: 'DB_SSL_ENABLED'
            }
        }
    },

    kafka: {
        host: {
            format: String,
            default: 'localhost',
            env: 'KAFKA_HOST'
        },
        port: {
            format: String,
            default: '29092',
            env: 'KAFKA_PORT'
        },
        autoCommit: {
            format: Boolean,
            default: false,
            env: 'KAFKA_AUTOCOMMIT'
        },
        concurrency: {
            format: 'nat',
            default: 1,
            env: 'KAFKA_CONCURRENCY'
        },
        consumerGroup: {
            format: String,
            default: 'remediations-consumer',
            env: 'KAFKA_CONSUMER_GROUP'
        },
        logging: {
            format: Boolean,
            default: false,
            env: 'KAFKA_LOGGING'
        },
        topics: {
            advisor: {
                topic: {
                    format: String,
                    default: 'platform.remediation-updates.advisor',
                    env: 'ADVISOR_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'ADVISOR_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'ADVISOR_TOPIC_ENABLED'
                }
            },
            compliance: {
                topic: {
                    format: String,
                    default: 'platform.remediation-updates.compliance',
                    env: 'COMPLIANCE_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'COMPLIANCE_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'COMPLIANCE_TOPIC_ENABLED'
                }
            },
            inventory: {
                topic: {
                    format: String,
                    default: 'platform.inventory.events',
                    env: 'INVENTORY_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'INVENTORY_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'INVENTORY_TOPIC_ENABLED'
                }
            },
            patch: {
                topic: {
                    format: String,
                    default: 'platform.remediation-updates.patch',
                    env: 'PATCH_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'PATCH_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'PATCH_TOPIC_ENABLED'
                }
            },
            receptor: {
                topic: {
                    format: String,
                    default: 'platform.receptor-controller.responses',
                    env: 'RECEPTOR_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'RECEPTOR_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'RECEPTOR_TOPIC_ENABLED'
                }
            },
            vulnerability: {
                topic: {
                    format: String,
                    default: 'platform.remediation-updates.vulnerability',
                    env: 'VULNERABILITY_TOPIC'
                },
                resetOffsets: {
                    format: Boolean,
                    default: false,
                    env: 'VULNERABILITY_RESET_OFFSETS'
                },
                enabled: {
                    format: Boolean,
                    default: false,
                    env: 'VULNERABILITY_TOPIC_ENABLED'
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

// load Clowder Config
// eslint-disable-next-line no-process-env
const acgConfig = process.env.ACG_CONFIG;
if (acgConfig) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const clowdAppConfig = require(acgConfig); // eslint-disable-line security/detect-non-literal-require

    const data: any = {
        metrics: {
            port: clowdAppConfig.metricsPort
        }
    };

    // Cloudwatch settings
    if (_.get(clowdAppConfig, 'logging.cloudwatch.accessKeyId') !== '') {
        data.logging = {};
        data.logging.cloudwatch = {
            enabled: true,
            key: clowdAppConfig.logging.cloudwatch.accessKeyId,
            secret: clowdAppConfig.logging.cloudwatch.secretAccessKey,
            group: clowdAppConfig.logging.cloudwatch.logGroup,
            region: clowdAppConfig.logging.cloudwatch.region
        };
    }

    // DB settings
    data.db = {
        connection: {
            user: clowdAppConfig.database.adminUsername,
            password: clowdAppConfig.database.adminPassword,
            database: clowdAppConfig.database.name,
            host: clowdAppConfig.database.hostname,
            port: clowdAppConfig.database.port
        }
    };

    if (clowdAppConfig.database.sslMode !== 'disable') {
        data.db.ssl = { enabled: true };
        data.db.connection.ssl = {
            ca: clowdAppConfig.database.rdsCa
        };
    }

    // Kafka settings
    data.kafka = {
        host: clowdAppConfig.kafka.brokers[0].hostname,
        port: clowdAppConfig.kafka.brokers[0].port.toString()
    };

    config.load(data);
}

config.validate({ strict: true });

export default config.get();
export const sanitized = config.toString();
