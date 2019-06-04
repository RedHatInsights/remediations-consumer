/* eslint no-empty: off */

import * as fs from 'fs';
import { version } from '../../package.json';
import config from '../config';

function getCommit (): string | undefined {
    if (config.commit) {
        return String(config.commit);
    }

    try {
        return fs.readFileSync('commit.txt', 'utf-8').trim();
    } catch (ignored) {
    }
}

const result = {
    version,
    short: 'unknown',
    commit: 'unknown',
    full: 'unknown'
};

const commit = getCommit();

if (commit) {
    result.commit = commit;
    result.short = commit.substring(0, 7);
} else if (['development', 'test'].includes(config.env)) {
    result.commit = result.short = config.env;
}

result.full = `RemediationsConsumer/${result.short}`;

export default result;
