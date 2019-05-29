'use strict';

const client = require('prom-client');
const http = require('http');
const {prefix, port} = require('../config').get('metrics');

const collectDefaultMetrics = client.collectDefaultMetrics;

exports.client = client;

let server = null;

exports.start = function () {
    collectDefaultMetrics({
        prefix,
        timeout: 5000
    });

    server = http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(client.register.metrics());
        res.end();
    });

    server.listen(port);
    return server;
};

exports.stop = function () {
    if (!server) {
        return;
    }

    const s = server;
    server = null;
    s.close();
};
