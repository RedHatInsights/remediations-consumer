import * as http from 'http';
import * as client from 'prom-client';
import config from '../config';

export { client };

export function start (): () => void {
    client.collectDefaultMetrics({
        prefix: config.metrics.prefix,
        timeout: 5000
    });

    const server = http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(client.register.metrics());
        res.end();
    });

    server.listen(config.metrics.port);
    return () => server.close();
}
