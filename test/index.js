'use strict';

const sinon = require('sinon');
const db = require('../src/db');
require('should');

beforeAll(() => db.start());
afterAll(() => db.stop());

beforeEach(() => {
    exports.sandbox = sinon.createSandbox();
});

exports.getSandbox = () => exports.sandbox;

afterEach(() => {
    exports.sandbox.restore();
    delete exports.sandbox;
});
