import * as sinon from 'sinon';
import * as db from '../src/db';
import 'should';

beforeAll(() => db.start());
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
