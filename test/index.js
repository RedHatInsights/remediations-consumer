import * as sinon from 'sinon';
import * as db from '../src/db';
import 'should';

beforeAll(() => db.start());
afterAll(() => db.stop());

export let sandbox = null;

beforeEach(() => {
    sandbox = sinon.createSandbox();
});

afterEach(() => {
    sandbox.restore();
    sandbox = null;
});
