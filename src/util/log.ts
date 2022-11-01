import pino from 'pino';
import config from '../config';
import * as pinoms from 'pino-multi-stream';
import pinoCW from 'pino-cloudwatch';
import { logLevel } from 'kafkajs';

function buildDestination () {
    if (!config.logging.cloudwatch.enabled) {
        return pino.destination(1); // stdout
    }

    const cwOptions = {
        group: config.logging.cloudwatch.group,
        prefix: config.logging.cloudwatch.prefix,
        interval: config.logging.cloudwatch.interval,
        aws_access_key_id: config.logging.cloudwatch.key,
        aws_secret_access_key: config.logging.cloudwatch.secret,
        aws_region: config.logging.cloudwatch.region
    };

    return pinoms.multistream([{
        stream: pino.destination(1),
        level: config.logging.level as pino.Level
    }, {
        stream: pinoCW(cwOptions),
        level: config.logging.cloudwatch.level as pino.Level
    }]);
}

const logger: pino.Logger = pino({
    name: 'remediations-consumer',
    level: config.logging.level,
    prettyPrint: config.logging.pretty && !config.logging.cloudwatch.enabled ? {
        errorProps: '*'
    } : false
}, buildDestination());

export function toPinoLogLevel(level: logLevel) {
    switch (level) {
        case logLevel.ERROR:
            return 'error';
        case logLevel.WARN:
            return 'warn';
        case logLevel.DEBUG:
            return 'debug';
        case logLevel.NOTHING:
            return 'silent';
        case logLevel.INFO:
        default:
            return 'info';
    }
}

export default logger.child({ type: 'application' });
