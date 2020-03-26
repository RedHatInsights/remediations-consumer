import * as sinon from 'sinon';
import * as db from '../src/db';
import * as config from '../src/config';
import 'should';

beforeAll(() => db.start(config.default.db));
afterAll(() => db.stop());

let sandbox: sinon.SinonSandbox | null = null;

export function getSandbox (): sinon.SinonSandbox {
    if (!sandbox) {
        throw new Error('sandbox not defined');
    }

    return sandbox;
}

beforeEach(() => {
    sandbox = sinon.createSandbox();
});

afterEach(() => {
    getSandbox().restore();
    sandbox = null;
});
