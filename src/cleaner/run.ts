import config, { sanitized } from './config';
import { start, stop } from '../db';
import version from '../util/version';
import log from '../util/log';
import * as probes from './probes';
import { cancelSystems, cancelExecutors, cancelRuns } from './queries';

async function run () {
    log.info({env: config.env}, `${version.full} starting`);
    log.debug(sanitized, 'configuration');
    const knex = await start(config.db);
    log.info('connected to database');

    try {
        await probes.updateEntities('systems', () => cancelSystems(knex, config.cleaner.timeoutSystems));
        await probes.updateEntities('executors', () => cancelExecutors(knex, config.cleaner.timeoutExecutors));
        await probes.updateEntities('runs', () => cancelRuns(knex, config.cleaner.timeoutRuns));
    } finally {
        try {
            await probes.pushMetrics();
        } finally {
            await stop();
        }
    }
}

if (require.main === module) {
    process.on('unhandledRejection', (reason: any) => {
        log.fatal(reason);
        throw reason;
    });

    run();
}
