import '../config';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as tmp from 'tmp';
import convict from 'convict';
import * as convict_format_with_validator from 'convict-format-with-validator';

convict.addFormats(convict_format_with_validator);

const config = convict({
    env: {
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV'
    },
    namespace: {
        format: String,
        default: 'local',
        env: 'NAMESPACE'
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
                default: 'remediations-cleaner',
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
                format: 'port',
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

    metrics: {
        prefix: {
            format: String,
            default: 'remediations_cleaner_',
            env: 'METRICS_PREFIX'
        },
        pushGateway: {
            format: 'url',
            default: 'http://localhost:9091',
            env: 'METRICS_PUSH_GATEWAY'
        }
    },

    cleaner: {
        timeoutSystems: {
            format: 'nat',
            default: 1 * 60,
            env: 'CLEANER_TIMEOUT_SYSTEMS'
        },
        timeoutExecutors: {
            format: 'nat',
            default: 15,
            env: 'CLEANER_TIMEOUT_EXECUTORS'
        },
        timeoutRuns: {
            format: 'nat',
            default: 15,
            env: 'CLEANER_TIMEOUT_RUNS'
        }
    }
});

// load Clowder Config
// eslint-disable-next-line no-process-env
const acgConfig = process.env.ACG_CONFIG;
if (acgConfig) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const clowdAppConfig = require(acgConfig); // eslint-disable-line security/detect-non-literal-require

    const data: any = {};

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

    config.load(data);
}

config.validate({ strict: true });

export default config.get();
export const sanitized = config.toString();
