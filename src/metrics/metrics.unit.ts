import * as supertest from 'supertest';
import metrics from './';

const request = supertest.agent('http://localhost:9006/');

let stop: any = null;

beforeAll(() => stop = metrics());
afterAll(() => stop());

describe('metrics unit tests', function () {
    test('parses a message', async () => {
        return request
        .get('metrics')
        .expect(200);
    });
});
