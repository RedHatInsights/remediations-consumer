import * as client from 'prom-client';
import config from './config';
import log from '../util/log';
import * as P from 'bluebird';
import * as os from 'os';

const logger = log.child({type: 'cleaner'});

function createCounter (name: string, help: string, ...labelNames: string[]) {
    return new client.Counter({
        name: `${config.metrics.prefix}${name}`, help, labelNames
    });
}

function createGauge (name: string, help: string, ...labelNames: string[]) {
    return new client.Gauge({
        name: `${config.metrics.prefix}${name}`, help, labelNames
    });
}

const updated = createCounter('updated_total', 'Total number of updated records', 'entity');
const duration = createGauge('update_duration_seconds', 'Total time spent running the UPDATE command', 'entity');

['systems', 'executors', 'runs'].forEach(value => updated.labels(value).inc(0));
['systems', 'executors', 'runs'].forEach(value => duration.labels(value).inc(0));

export async function updateEntities (type: 'systems' | 'executors' | 'runs', fn: () => Promise<number>) {
    const stop = duration.labels(type).startTimer();
    try {
        const count = await fn();
        updated.labels(type).inc(count);
        logger.info({count}, `updated ${type}`);
    } finally {
        stop();
    }
}

export async function pushMetrics () {
    const gateway: any = new client.Pushgateway(config.metrics.pushGateway);
    const asyncGateway = P.promisifyAll(gateway);

    const jobName = `${config.namespace}/${os.hostname}`;
    logger.info({jobName}, 'pushing metrics');
    await asyncGateway.pushAddAsync({jobName});
}
