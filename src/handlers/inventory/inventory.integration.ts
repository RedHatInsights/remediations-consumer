/* eslint-disable max-len */

import { getSandbox } from '../../../test';
import handler from '.';
import * as db from '../../db';
import * as probes from '../../probes';
import config from '../../config';
import { v4 as uuidv4 } from 'uuid';
import should from 'should';
import sinon from 'sinon';

const buildUpdateMessage = (
    systemId: string,
    hostname?: string,
    displayName?: string,
    ansibleHost?: string
) => ({
    topic: 'platform.inventory.events',
    value: JSON.stringify({
        type: 'updated',
        host: {
            id: systemId,
            ...(hostname && { fqdn: hostname }),
            ...(displayName && { display_name: displayName }),
            ...(ansibleHost && { ansible_host: ansibleHost })
        }
    }),
    offset: 0,
    partition: 58,
    highWaterOffset: 1,
    key: systemId
});

describe('inventory handler integration tests', function () {
    describe('delete events', () => {
        test('removes system references', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "aa94b090-ea16-46ed-836d-5f42a918e9c7"}',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryRemoveSuccess');

            await handler(message);
            const [{ count }] = await db.get()('remediation_issue_systems').where({ system_id: 'aa94b090-ea16-46ed-836d-5f42a918e9c7' }).count();
            parseInt(count as string).should.equal(0);
            spy.callCount.should.equal(1);
        });

        test('removes system from systems table', async () => {
            const systemId = 'f35b1e1d-162f-4e87-93f6-d29169a4e16a';
            
            // First, insert a system record
            await db.get()('systems').insert({
                id: systemId,
                hostname: 'test-host.example.com',
                display_name: 'Test Host',
                ansible_hostname: 'test-ansible-host'
            });

            // Verify it exists
            const systemBefore = await db.get()('systems').where({ id: systemId }).first();
            should.exist(systemBefore);

            const message = {
                topic: 'platform.inventory.events',
                value: `{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "${systemId}"}`,
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryRemoveSuccess');

            await handler(message);

            // Verify system is removed from systems table
            const systemAfter = await db.get()('systems').where({ id: systemId }).first();
            should.not.exist(systemAfter);

            // Also verify remediation_issue_systems is cleaned up
            const [{ count }] = await db.get()('remediation_issue_systems').where({ system_id: systemId }).count();
            parseInt(count as string).should.equal(0);
            
            spy.callCount.should.equal(1);
        });

        test('does nothing on unknown host', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "dde971ae-0a39-4c2b-9041-a92e2d5a96ab"}',
                offset: 0,
                partition: 12,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryRemoveUnknown');

            await handler(message);
            spy.callCount.should.equal(1);
        });

        test('does not remove anything in dryRun', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "delete", "timestamp": "2019-05-23T18:31:39.065368+00:00", "id": "dde971ae-0a39-4c2b-9041-a92e2d5a96aa"}',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryRemoveSuccess');
            getSandbox().stub(config.db, 'dryRun').get(() => true);

            await handler(message);
            const [{ count }] = await db.get()('remediation_issue_systems').where({ system_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96aa' }).count();
            parseInt(count as string).should.equal(2);
            spy.callCount.should.equal(0);
        });
    });

    describe('update events', () => {
        test('ignores update for non-existent system', async () => {
            const systemId = uuidv4();
            const message = buildUpdateMessage(systemId, 'test-host.example.com', 'Test Host');
            const spy = getSandbox().spy(probes, 'inventoryUpdateSuccess');

            await handler(message);

            spy.callCount.should.equal(0);
            const result = await db.get()('systems').where({ id: systemId }).first();
            should(result).be.undefined();
        });

        test('updates existing system with complete data', async () => {
            const systemId = uuidv4();
            
            await db.get()('systems').insert({
                id: systemId,
                hostname: 'old-hostname.example.com',
                display_name: 'Old Display Name',
                ansible_hostname: 'old-ansible-host',
                created_at: new Date('2020-01-01'),
                updated_at: new Date('2020-01-01')
            });

            const message = buildUpdateMessage(systemId, 'test-host.example.com', 'Test Host', 'test-ansible-host');
            const spy = getSandbox().spy(probes, 'inventoryUpdateSuccess');

            await handler(message);

            spy.callCount.should.equal(1);
            spy.calledWithExactly(systemId).should.be.true();

            const result = await db.get()('systems').where({ id: systemId }).first();
            result.should.not.be.undefined();
            result.id.should.equal(systemId);
            result.hostname.should.equal('test-host.example.com');
            result.display_name.should.equal('Test Host');
            result.ansible_hostname.should.equal('test-ansible-host');
            result.created_at.toISOString().should.equal('2020-01-01T00:00:00.000Z');
            new Date(result.updated_at).getTime().should.be.greaterThan(new Date('2020-01-01').getTime());
        });

        test('preserves existing fields when partial data received', async () => {
            const systemId = uuidv4();
            
            await db.get()('systems').insert({
                id: systemId,
                hostname: 'existing-hostname.example.com',
                display_name: 'Existing Display',
                ansible_hostname: 'existing-ansible',
                created_at: new Date('2020-01-01'),
                updated_at: new Date('2020-01-01')
            });

            const message = buildUpdateMessage(
                systemId,
                undefined,
                'Updated Display Name',
                undefined
            );
            const spy = getSandbox().spy(probes, 'inventoryUpdateSuccess');

            await handler(message);

            spy.callCount.should.equal(1);
            spy.calledWithExactly(systemId).should.be.true();

            const result = await db.get()('systems').where({ id: systemId }).first();
            result.should.not.be.undefined();
            result.id.should.equal(systemId);
            result.hostname.should.equal('existing-hostname.example.com');
            result.display_name.should.equal('Updated Display Name');
            result.ansible_hostname.should.equal('existing-ansible');
            new Date(result.updated_at).getTime().should.be.greaterThan(new Date('2020-01-01').getTime());
        });

        test('updates existing system with realistic complete state', async () => {
            const systemId = uuidv4();
            
            await db.get()('systems').insert({
                id: systemId,
                hostname: 'existing-hostname.example.com',
                display_name: 'Existing Display',
                ansible_hostname: 'existing-ansible',
                created_at: new Date('2020-01-01'),
                updated_at: new Date('2020-01-01')
            });

            const message = buildUpdateMessage(systemId, 'existing-hostname.example.com', 'Updated Display Name', 'existing-ansible');
            const spy = getSandbox().spy(probes, 'inventoryUpdateSuccess');

            await handler(message);

            spy.callCount.should.equal(1);
            spy.calledWithExactly(systemId).should.be.true();

            const result = await db.get()('systems').where({ id: systemId }).first();
            result.should.not.be.undefined();
            result.id.should.equal(systemId);
            result.hostname.should.equal('existing-hostname.example.com');
            result.display_name.should.equal('Updated Display Name');
            result.ansible_hostname.should.equal('existing-ansible');
            result.created_at.toISOString().should.equal('2020-01-01T00:00:00.000Z');
            new Date(result.updated_at).getTime().should.be.greaterThan(new Date('2020-01-01').getTime());
        });

        test('handles database errors', async () => {
            const systemId = uuidv4();
            
            await db.get()('systems').insert({
                id: systemId,
                hostname: 'test-host.example.com',
                display_name: 'Test Host',
                ansible_hostname: 'test-ansible',
                created_at: new Date(),
                updated_at: new Date()
            });
            
            const message = buildUpdateMessage(systemId, 'new-hostname.example.com');

            const spy = getSandbox().spy(probes, 'inventoryUpdateError');
            getSandbox().stub(db, 'updateSystem').throws(new Error('DB error'));

            await handler(message);

            spy.calledOnce.should.be.true();
            spy.calledWithExactly(systemId, sinon.match.instanceOf(Error)).should.be.true();
        });

        test('handles malformed JSON in update events', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: '{"type": "updated", "host": {',
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryErrorParse');

            await handler(message);

            spy.calledOnce.should.be.true();
            spy.calledWithExactly(message, sinon.match.instanceOf(SyntaxError)).should.be.true();
        });

        test('handles schema validation errors', async () => {
            const message = {
                topic: 'platform.inventory.events',
                value: JSON.stringify({
                    type: 'updated',
                    timestamp: '2019-05-23T18:31:39.065368+00:00',
                    host: {
                        display_name: 'Test Host'
                        // Missing required id field
                    }
                }),
                offset: 0,
                partition: 58,
                highWaterOffset: 1,
                key: undefined
            };

            const spy = getSandbox().spy(probes, 'inventoryErrorParse');

            await handler(message);

            spy.calledOnce.should.be.true();
            spy.calledWithExactly(message, sinon.match.instanceOf(Error)).should.be.true();
        });

        test('concurrent update operations', async () => {
            const systemId1 = uuidv4();
            const systemId2 = uuidv4();
            const systemId3 = uuidv4();

            // Pre-populate systems that are part of remediation plans
            await db.get()('systems').insert([
                {
                    id: systemId1,
                    hostname: 'old-host1.example.com',
                    display_name: 'Old Host 1',
                    ansible_hostname: 'old-ansible1',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: systemId2,
                    hostname: 'old-host2.example.com',
                    display_name: 'Old Host 2',
                    ansible_hostname: 'old-ansible2',
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: systemId3,
                    hostname: 'old-host3.example.com',
                    display_name: 'Old Host 3',
                    ansible_hostname: 'old-ansible3',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);

            const messages = [
                buildUpdateMessage(systemId1, 'host1.example.com', 'Host 1'),
                buildUpdateMessage(systemId2, 'host2.example.com', 'Host 2'),
                buildUpdateMessage(systemId3, 'host3.example.com', 'Host 3')
            ];

            const spy = getSandbox().spy(probes, 'inventoryUpdateSuccess');

            await Promise.all(messages.map(handler));

            spy.callCount.should.equal(3);
            spy.calledWithExactly(systemId1).should.be.true();
            spy.calledWithExactly(systemId2).should.be.true();
            spy.calledWithExactly(systemId3).should.be.true();

            // Verify all systems were updated
            const results = await db.get()('systems')
                .whereIn('id', [systemId1, systemId2, systemId3])
                .orderBy('hostname');

            results.length.should.equal(3);
            results[0].hostname.should.equal('host1.example.com');
            results[1].hostname.should.equal('host2.example.com');
            results[2].hostname.should.equal('host3.example.com');
        });
    });
});
