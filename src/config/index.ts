import convict from 'convict';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as process from 'process';
import formats from './formats';

/* eslint-disable max-len */

convict.addFormat(formats);

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
        connectionTimeout: {
            format: Number,
            default: 1000,
            env: 'KAFKA_CONNECTION_TIMEOUT'
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
        },
        ssl: {
            enabled: {
                format: Boolean,
                default: false,
                env: 'KAFKA_SSL_ENABLED'
            },
            ca: {
                format: String,
                default: '',
                env: 'KAFKA_CA',
                sensitive: true
            },
            key: {
                format: String,
                default: '',
                env: 'KAFKA_CA_KEY',
                sensitive: true
            },
            rejectUnauthorized: {
                format: Boolean,
                default: true,
                env: 'KAFKA_SSL_REJECT_UNAUTHORIZED'
            }
        },
        sasl: {
            mechanism: {
                format: String,
                default: 'plain',
                env: 'KAFKA_SASL_MECHANISM'
            },
            username: {
                format: String,
                default: '',
                env: 'KAFKA_SASL_USERNAME'
            },
            password: {
                format: String,
                default: '',
                env: 'KAFKA_SASL_PASSWORD',
                sensitive: true
            },
            securityProtocol: {
                format: String,
                default: '',
                env: 'KAFKA_SECURITY_PROTOCOL'
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

function processTopicName (cappconfig: any, key: string): string {
    const output = cappconfig.kafka.topics.find(({ requestedName }: { requestedName: string }) => requestedName === key);
    return output ? output.name : '';
}

function processTopicEnabled (cappconfig: any, key: string): boolean {
    return Boolean(cappconfig.kafka.topics.find(({ requestedName }: { requestedName: string }) => requestedName === key));
}

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

        const tmpobj = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.txt' });
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(tmpobj.name, clowdAppConfig.database.rdsCa, 'utf8');

        data.db.connection.ssl = {
            ca: tmpobj.name
        };
    }

    // Kafka settings
    data.kafka = {
        host: clowdAppConfig.kafka.brokers[0].hostname,
        port: clowdAppConfig.kafka.brokers[0].port.toString()
    };

    data.kafka.topics = {
    // Kafka topic settings
        advisor: {
            topic: processTopicName(clowdAppConfig, 'platform.remediation-updates.advisor'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.remediation-updates.advisor')
        },
        compliance: {
            topic: processTopicName(clowdAppConfig, 'platform.remediation-updates.compliance'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.remediation-updates.compliance')
        },
        inventory: {
            topic: processTopicName(clowdAppConfig, 'platform.inventory.events'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.inventory.events')
        },
        patch: {
            topic: processTopicName(clowdAppConfig, 'platform.remediation-updates.patch'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.remediation-updates.patch')
        },
        receptor: {
            topic: processTopicName(clowdAppConfig, 'platform.receptor-controller.responses'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.receptor-controller.responses')
        },
        vulnerability: {
            topic: processTopicName(clowdAppConfig, 'platform.remediation-updates.vulnerability'),
            enabled: processTopicEnabled(clowdAppConfig, 'platform.remediation-updates.vulnerability')
        }
    };

    if (_.get(clowdAppConfig, 'kafka.brokers[0].sasl', '') !== '') {
        data.kafka.sasl = {
            username: clowdAppConfig.kafka.brokers[0].sasl.username,
            password: clowdAppConfig.kafka.brokers[0].sasl.password,
            mechanism: clowdAppConfig.kafka.brokers[0].sasl.saslMechanism,
            securityProtocol: clowdAppConfig.kafka.brokers[0].sasl.securityProtocol
        };

        data.kafka.ssl = {
            ca: clowdAppConfig.kafka.brokers[0].cacert
        };
    }

    config.load(data);
}

// debug comment
config.validate({ strict: true });

export default config.get();
export const sanitized = config.toString();
