/* eslint-disable max-len */

import onMessage, { SatReceptorResponse, ReceptorMessage } from '.';
import {getSandbox} from '../../../test';
import * as probes from '../../probes';
import * as db from '../../db';
import * as _ from 'lodash';
import * as P from 'bluebird';
import {v4} from 'uuid';
import { Status, PlaybookRunExecutor, PlaybookRun, PlaybookRunSystem } from './models';

describe('receptor handler integration tests', function () {

    let receptorError: any = null;
    let receptorErrorParse: any = null;

    beforeEach(() => {
        receptorError = getSandbox().spy(probes, 'receptorError');
        receptorErrorParse = getSandbox().spy(probes, 'receptorErrorParse');
    });

    function assertNoErrors () {
        receptorError.callCount.should.equal(0);
        receptorErrorParse.callCount.should.equal(0);
    }

    /*
     * Utility functions for creating a new playbook_run to be used in a test
     */
    function createRun (): any {
        return {
            id: v4(),
            status: Status.PENDING,
            remediation_id: '2b1d3b05-077b-4c9b-a48e-1e248eaf68b2',
            created_by: 'jharting'
        };
    }

    function createExecutor (runId: string): any {
        return {
            id: v4(),
            executor_id: v4(),
            executor_name: 'Satellite',
            receptor_node_id: v4(),
            receptor_job_id: v4(),
            playbook: '---',
            playbook_run_id: runId
        };
    }

    const DEFAULT_SEQUENCE = 0;
    const DEFAULT_CONSOLE = '';

    function createSystem (executorId: string): any {
        const systemId = v4();

        return {
            id: v4(),
            system_id: systemId,
            system_name: `${systemId}.example.com`,
            status: Status.PENDING,
            sequence: DEFAULT_SEQUENCE,
            console: DEFAULT_CONSOLE,
            playbook_run_executor_id: executorId
        };
    }

    async function insertPlaybookRun (transform = (f: any) => f, executors = 1, systems = 1) {
        const run = createRun();
        run.executors = _.times(executors).map(() => createExecutor(run.id));
        run.executors.forEach((executor: any) => {
            executor.systems = _.times(systems, () => createSystem(executor.id));
        });

        transform(run);

        const knex = db.get();
        await knex(PlaybookRun.TABLE).insert(_.omit(run, ['executors']));
        await P.each(run.executors, async (executor: any) => {
            await knex(PlaybookRunExecutor.TABLE).insert(_.omit(executor, ['systems']));
            await P.each(executor.systems, async (system: any) => knex(PlaybookRunSystem.TABLE).insert(system));
        });

        return run;
    }

    /*
     * Utility functions for creating kafka messages
     */
    function createKafkaMessage<T extends SatReceptorResponse> (value: ReceptorMessage<T>) {
        return {
            topic: 'platform.receptor-controller.responses',
            value: JSON.stringify(value),
            offset: 0,
            partition: 58,
            highWaterOffset: 1,
            key: undefined
        };
    }

    function responseEnvelope (payload: SatReceptorResponse, jobId: string, sender = 'fifi') {
        return {
            account: '00001',
            sender,
            message_id: '6cfa75ee-5ba9-442e-9557-6dbbf33593c4',
            message_type: 'response',
            in_response_to: jobId,
            serial: 3,
            payload
        };
    }

    /*
     * Utility functions for validating the result
     */
    async function getRun (id: string) {
        return (await db.get()(PlaybookRun.TABLE).where({id}).select('*'))[0];
    }

    async function getExecutor (id: string) {
        return (await db.get()(PlaybookRunExecutor.TABLE).where({id}).select('*'))[0];
    }

    async function getSystem (id: string) {
        return (await db.get()(PlaybookRunSystem.TABLE).where({id}).select('*'))[0];
    }

    async function assertRun (id: string, status = Status.PENDING) {
        const run = await getRun(id);
        run.status.should.equal(status);
    }

    async function assertExecutor (id: string, status = Status.PENDING) {
        const executor = await getExecutor(id);
        executor.status.should.equal(status);
    }

    async function assertSystem (id: string, status = Status.PENDING, sequence = DEFAULT_SEQUENCE, console = DEFAULT_CONSOLE) {
        const system = await getSystem(id);
        system.status.should.equal(status);
        system.sequence.should.equal(sequence);
        system.console.should.equal(console);
    }

    test('defaults (no message)', async () => {
        const data = await insertPlaybookRun();
        const e = data.executors[0];
        const s = e.systems[0];

        await assertRun(data.id);
        await assertExecutor(e.id);
        await assertSystem(s.id);
    });

    describe('playbook_run_ack', function () {
        function createAckPayload (runId: string){
            return {
                type: 'playbook_run_ack',
                playbook_run_id: runId
            };
        }

        test('acks executor', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertExecutor(e.id, Status.ACKED);
        });

        test('does not ack (running state)', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].status = Status.RUNNING;
            });
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertExecutor(e.id, Status.RUNNING);   
        });

        test('does not ack in final state (canceled state)', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].status = Status.CANCELED;
            });
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertExecutor(e.id, Status.CANCELED);   
        });

        test('does not ack in final state (success)', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].status = Status.SUCCESS;
            });
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertExecutor(e.id, Status.SUCCESS);   
        });

        test('does not ack in final state (failure)', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].status = Status.FAILURE;
            });
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertExecutor(e.id, Status.FAILURE);   
        });

        test('multiple messages', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];

            const payload1 = createAckPayload(data.id);
            const payload2 = createAckPayload(data.id);

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertExecutor(e.id, Status.ACKED);
        });

        test('does not ack executor (receptor_node_is mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];

            const payload1 = createAckPayload(data.id);
            const payload2 = createAckPayload(data.id);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, 'fifi')));

            assertNoErrors();
            await assertExecutor(e.id);
        });

        test('does not ack executor (receptor_job_is mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];

            const payload1 = createAckPayload(data.id);
            const payload2 = createAckPayload(data.id);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, 'e333fc77-b7d3-4404-a224-abee2903af70', e.receptor_node_id)));

            assertNoErrors();
            await assertExecutor(e.id);
        });

        test('does not ack neighbouring executors', async () => {
            const data = await insertPlaybookRun(undefined, 2, 2);
            const e = data.executors[0];

            const payload = createAckPayload(data.id);
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertExecutor(e.id, Status.ACKED);
            await assertExecutor(data.executors[1].id, Status.PENDING);
            await assertSystem(data.executors[0].systems[1].id, Status.PENDING);
            await assertSystem(data.executors[1].systems[0].id, Status.PENDING);
            await assertSystem(data.executors[1].systems[1].id, Status.PENDING);
        });
    });

    describe('playbook_run_update', function () {
        function createUpdatePayload (runId: string, host: string, sequence = 1, console = 'console text output') {
            return {
                type: 'playbook_run_update',
                playbook_run_id: runId,
                sequence,
                host,
                console
            };
        }

        test('updates records (default state)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const log = 'test01';
            const payload = createUpdatePayload(data.id, s.system_name, 2, log);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertRun(data.id, Status.RUNNING);
            await assertExecutor(e.id, Status.RUNNING);
            await assertSystem(s.id, Status.RUNNING, 2, log);
        });

        test('updates executor (acked state)', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].status = Status.ACKED;
            });

            const e = data.executors[0];
            const s = e.systems[0];
            const log = 'test02';
            const payload = createUpdatePayload(data.id, s.system_name, 2, log);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            assertExecutor(e.id, Status.RUNNING);
        });

        test('does not update records in final state (success)', async () => {
            const data = await insertPlaybookRun(run => {
                run.status = Status.SUCCESS;
                run.executors[0].status = Status.SUCCESS;
                run.executors[0].systems[0].status = Status.SUCCESS;
            });

            const e = data.executors[0];
            const s = e.systems[0];
            const log = 'test03';
            const payload = createUpdatePayload(data.id, s.system_name, 2, log);

            const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
            await onMessage(msg);

            assertNoErrors();
            await assertRun(data.id, Status.SUCCESS);
            await assertExecutor(e.id, Status.SUCCESS);
            await assertSystem(s.id, Status.SUCCESS);
        });

        test('does not update records in final state (failure)', async () => {
            const data = await insertPlaybookRun(run => {
                run.status = Status.FAILURE;
                run.executors[0].status = Status.FAILURE;
                run.executors[0].systems[0].status = Status.FAILURE;
            });

            const e = data.executors[0];
            const s = e.systems[0];
            const log = 'test03';
            const payload = createUpdatePayload(data.id, s.system_name, 2, log);

            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertRun(data.id, Status.FAILURE);
            await assertExecutor(e.id, Status.FAILURE);
            await assertSystem(s.id, Status.FAILURE);
        });

        test('does not update records in final state (canceled)', async () => {
            const data = await insertPlaybookRun(run => {
                run.status = Status.CANCELED;
                run.executors[0].status = Status.CANCELED;
                run.executors[0].systems[0].status = Status.CANCELED;
            });

            const e = data.executors[0];
            const s = e.systems[0];
            const log = 'test03';
            const payload = createUpdatePayload(data.id, s.system_name, 2, log);

            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertRun(data.id, Status.CANCELED);
            await assertExecutor(e.id, Status.CANCELED);
            await assertSystem(s.id, Status.CANCELED);
        });

        test('multiple messages', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 2, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 3, '12345678');

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 3, '12345678');
        });

        test('out-of-order message does not override more recent update', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 2, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 3, '12345678');

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 3, '12345678');
        });

        test('does not update anything (receptor_node_id mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, s.system_name, 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, 'fifi')));

            assertNoErrors();
            await assertRun(data.id);
            await assertExecutor(e.id);
            await assertSystem(s.id);
        });

        test('does not update anything (receptor_job_id mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, s.system_name, 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, 'e333fc77-b7d3-4404-a224-abee2903af70', e.receptor_node_id)));

            assertNoErrors();
            await assertRun(data.id);
            await assertExecutor(e.id);
            await assertSystem(s.id);
        });

        test('does not update system (system_name mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, 'foo.example.com', 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id);
        });

        test('does not update neighbouring executors/systems', async () => {
            const data = await insertPlaybookRun(undefined, 2, 2);
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, s.system_name, 2, 'yup');
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertRun(data.id, Status.RUNNING);
            await assertExecutor(e.id, Status.RUNNING);
            await assertExecutor(data.executors[1].id, Status.PENDING);
            await assertSystem(s.id, Status.RUNNING, 2, 'yup');
            await assertSystem(data.executors[0].systems[1].id, Status.PENDING);
            await assertSystem(data.executors[1].systems[0].id, Status.PENDING);
            await assertSystem(data.executors[1].systems[1].id, Status.PENDING);
        });
    });

});
