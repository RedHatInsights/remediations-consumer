/* eslint-disable max-len */

import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';

describe('inventory handler unit tests', function () {
    let inventoryErrorParse: any = null;

    beforeEach(() => {
        inventoryErrorParse = getSandbox().spy(probes, 'inventoryErrorParse');
    });

    describe('delete events', () => {
        test('parses a message', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4"}',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('parses a message with extra field', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4", "foo": "bar"}',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('throws error on missing field', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00"}',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(1);
        });

        test('throws error on invalid JSON', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id":',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(1);
        });
    });

    describe('update events', () => {
        test('parses a basic update message', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "updated",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "host": {
                        "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4",
                        "display_name": "test-host",
                        "fqdn": "test-host.example.com",
                        "ansible_host": "test-host-ansible"
                    }
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('ignores created messages (unsupported type)', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "created",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "host": {
                        "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4"
                    }
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('parses message with extra fields (ignored)', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "updated",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "host": {
                        "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4",
                        "display_name": "test-host"
                    },
                    "metadata": {
                        "request_id": "test-request-extra"
                    },
                    "platform_metadata": {"source": "satellite"}
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('ignores extra fields in host object', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "updated",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "host": {
                        "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4",
                        "display_name": "test-host",
                        "org_id": "test-org",
                        "extra_field": "ignored",
                        "system_profile": {"cpu": "x86_64"},
                        "tags": [{"key": "env", "value": "prod"}]
                    }
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });

        test('throws error on missing required host.id', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "updated",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "host": {
                        "display_name": "test-host"
                    }
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(1);
        });
    });

    describe('unsupported events', () => {
        test('ignores unsupported event types', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    "type": "unknown_event_type",
                    "timestamp": "2019-05-23T18:31:39.065368+00:00",
                    "id": "6cfa75ee-5ba9-442e-9557-6dbbf33593c4"
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            await handler(message);
            inventoryErrorParse.callCount.should.equal(0);
        });
    });
});
