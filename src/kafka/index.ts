/* eslint-disable max-len */

import _ from 'lodash';
import { Kafka, logLevel, LogEntry } from 'kafkajs';
import pino from 'pino';

import config from '../config';
import log, { toPinoLogLevel } from '../util/log';
import { TopicConfig } from '../format';
import * as probes from '../probes';

function kafkaLogLevel () {
    if (config.kafka.logging) {
        switch (config.logging.level) {
            case 'DEBUG':
                return logLevel.DEBUG;
            case 'TRACE':
                return logLevel.DEBUG;
            case 'INFO':
                return logLevel.INFO;
            case 'ERROR':
                return logLevel.ERROR;
            default:
                return logLevel.INFO;
        }
    }

    return undefined;
}

const pinoLogCreator = (logLevel: logLevel) => {
    const logger = pino({
        name: 'remediations-consumer',
        level: toPinoLogLevel(logLevel),
        prettyPrint: config.logging.pretty && !config.logging.cloudwatch.enabled ? {
            errorProps: '*'
        } : false
    });

    return ({ log }: LogEntry) => {
        const pinoLevel = toPinoLogLevel(logLevel);
        const { message, ...extras} = log;
        // eslint-disable-next-line security/detect-object-injection
        logger[pinoLevel](extras, message);
    };
};

function configureBroker () {
    return new Kafka({
        logLevel: kafkaLogLevel(),
        logCreator: pinoLogCreator,
        brokers: [`${config.kafka.host}:${config.kafka.port}`],
        connectionTimeout: config.kafka.connectionTimeout,
        ssl: {
            ca: config.kafka.ssl.ca,
            key: config.kafka.ssl.key,
            cert: config.kafka.ssl.cert,
            rejectUnauthorized: config.kafka.ssl.rejectUnauthorized
        },
        sasl: {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            mechanism: config.kafka.sasl.mechanism,
            username: config.kafka.sasl.username,
            password: config.kafka.sasl.password
        }
    });
}

function connect () {
    const kafka = configureBroker();
    const consumer = kafka.consumer({ groupId: config.kafka.consumerGroup });

    return {
        consumer,
        stop () {
            return consumer.stop();
        }
    };
}

export async function start (topicConfig: TopicConfig[]) {
    const {consumer, stop} = await connect();

    const topics = topicConfig.map(topic => { return topic.topic; });
    log.info('TOPICS ENABLED', topics);

    await consumer.connect();
    log.info('connected to Kafka');

    // Subscribe to each enabled topic
    for (const topic of topicConfig) {
        await consumer.subscribe({ topic: topic.topic });
    }

    await consumer.run({
        autoCommit: config.kafka.autoCommit,
        partitionsConsumedConcurrently: config.kafka.concurrency,
        eachMessage: async ({ topic, message }) => {
            probes.incomingMessage(topic, message);
            const handlers = _(topicConfig).keyBy('topic').mapValues(details => details.handler).value();
            // eslint-disable-next-line security/detect-object-injection
            const handler = handlers[topic];
            await handler(message);
        }
    });

    return {
        consumer,
        async stop () {
            await stop();
        }
    };
}
