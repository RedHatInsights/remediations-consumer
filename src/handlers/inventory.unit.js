'use strict';

const handler = require('./inventory');

describe('inventory handler', function () {
    test('simple', async () => {
        await handler();
    });
});
