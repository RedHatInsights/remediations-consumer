/* eslint-disable max-len */

import onMessage, { SatReceptorResponse, ReceptorMessage } from '.';
import {getSandbox} from '../../../test';
import * as probes from '../../probes';
import { Status } from './models';
import { insertPlaybookRun, assertRun, assertExecutor, assertSystem } from '../../../test/playbookRuns';

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

    test('defaults (no message)', async () => {
        const data = await insertPlaybookRun();
        const e = data.executors[0];
        const s = e.systems[0];

        await assertRun(data.id);
        await assertExecutor(e.id);
        await assertSystem(s.id);
    });

    describe('playbook_run_ack', function () {
        function createAckPayload (runId: string) {
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

        [Status.RUNNING, Status.CANCELED, Status.SUCCESS, Status.FAILURE].forEach(status =>
            test(`does not ack (${status})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].status = status;
                });
                const e = data.executors[0];

                const payload = createAckPayload(data.id);

                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertExecutor(e.id, status);
            })
        );

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

            const payload = createAckPayload(data.id);

            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, 'fifi')));

            assertNoErrors();
            await assertExecutor(e.id);
        });

        test('does not ack executor (receptor_job_is mismatch)', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];

            const payload = createAckPayload(data.id);

            await onMessage(createKafkaMessage(responseEnvelope(payload, 'e333fc77-b7d3-4404-a224-abee2903af70', e.receptor_node_id)));

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

        [Status.PENDING, Status.ACKED].forEach(status =>
            test(`updates records FULL (${status})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].status = status;
                });
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
            })
        );

        [Status.PENDING, Status.ACKED].forEach(status =>
            test(`updates records DIFF (${status})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].status = status;
                    run.executors[0].text_update_full = false;
                });
                const e = data.executors[0];
                const s = e.systems[0];

                const log = 'test01append';
                const payload = createUpdatePayload(data.id, s.system_name, 1, log);

                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertRun(data.id, Status.RUNNING);
                await assertExecutor(e.id, Status.RUNNING);
                await assertSystem(s.id, Status.RUNNING, 1, log);
            })
        );

        [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach(status =>
            test(`does not update records in final state FULL (${status})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.status = status;
                    run.executors[0].status = status;
                    run.executors[0].systems[0].status = status;
                });

                const e = data.executors[0];
                const s = e.systems[0];
                const log = 'test03';
                const payload = createUpdatePayload(data.id, s.system_name, 2, log);

                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertRun(data.id, status);
                await assertExecutor(e.id, status);
                await assertSystem(s.id, status);
            })
        );

        [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach(status =>
            test(`does not update records in final state DIFF (${status})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.status = status;
                    run.executors[0].status = status;
                    run.executors[0].text_update_full = false;
                    run.executors[0].systems[0].status = status;
                });

                const e = data.executors[0];
                const s = e.systems[0];
                const log = 'test02append';
                const payload = createUpdatePayload(data.id, s.system_name, 1, log);

                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertRun(data.id, status);
                await assertExecutor(e.id, status);
                await assertSystem(s.id, status);
            })
        );

        test('multiple messages FULL', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 2, '12345678');

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 2, '12345678');
        });

        test('multiple messages DIFF', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 2, '5678');

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 2, '12345678'); // change this later
        });

        test('out-of-order message does not override more recent update FULL', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 2, '12345678');

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 2, '12345678');
        });

        test('out-of-order message does not override more recent update DIFF', async () => {
            const lostMessage = getSandbox().spy(probes, 'lostUpdateMessage');
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 2, '12345678');

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 2, '\n\u2026\n12345678');
            lostMessage.callCount.should.eql(1);
        });

        test('multiple missing messages DIFF', async () => {
            const lostMessage = getSandbox().spy(probes, 'lostUpdateMessage');
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1');
            const payload2 = createUpdatePayload(data.id, s.system_name, 8, '8');

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 8, '1\n\u2026\n\n\u2026\n\n\u2026\n\n\u2026\n\n\u2026\n\n\u2026\n8');
            lostMessage.callCount.should.eql(1);
        });

        test('Missing messages are logged in console DIFF', async () => {
            const lostMessage = getSandbox().spy(probes, 'lostUpdateMessage');
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload1 = createUpdatePayload(data.id, s.system_name, 1, '1234');
            const payload2 = createUpdatePayload(data.id, s.system_name, 3, '5678');

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id, Status.RUNNING, 3, '1234\n\u2026\n5678');
            lostMessage.callCount.should.eql(1);
        });

        test('does not update anything (receptor_node_id mismatch) FULL', async () => {
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

        test('does not update anything (receptor_node_id mismatch) DIFF', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, s.system_name, 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, 'fifi')));

            assertNoErrors();
            await assertRun(data.id);
            await assertExecutor(e.id);
            await assertSystem(s.id);
        });

        test('does not update anything (receptor_job_id mismatch) FULL', async () => {
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

        test('does not update anything (receptor_job_id mismatch) DIFF', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, s.system_name, 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, 'e333fc77-b7d3-4404-a224-abee2903af70', e.receptor_node_id)));

            assertNoErrors();
            await assertRun(data.id);
            await assertExecutor(e.id);
            await assertSystem(s.id);
        });

        test('does not update system (system_name mismatch) FULL', async () => {
            const data = await insertPlaybookRun();
            const e = data.executors[0];
            const s = e.systems[0];

            const payload = createUpdatePayload(data.id, 'foo.example.com', 2, 'nope');
            await onMessage(createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id)));

            assertNoErrors();
            await assertSystem(s.id);
        });

        test('does not update system (system_name mismatch) DIFF', async () => {
            const data = await insertPlaybookRun(run => {
                run.executors[0].text_update_full = false;
            });
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

    describe('playbook_run_finished', function () {
        function createFinishedPayload (runId: string, host: string, status: Status) {
            return {
                type: 'playbook_run_finished',
                playbook_run_id: runId,
                host,
                status
            };
        }

        [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach(status =>
            test(`updates records to ${status} (default state)`, async () => {
                const data = await insertPlaybookRun();
                const e = data.executors[0];
                const s = e.systems[0];

                const payload = createFinishedPayload(data.id, s.system_name, status);
                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertRun(data.id, status);
                await assertExecutor(e.id, status);
                await assertSystem(s.id, status);
            })
        );

        [[Status.FAILURE, Status.SUCCESS], [Status.CANCELED, Status.FAILURE], [Status.FAILURE, Status.CANCELED]].forEach(([initial, status]) =>
            test(`does not update records in final state (${initial})`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.status = initial;
                    run.executors[0].status = initial;
                    run.executors[0].systems[0].status = initial;
                });

                const e = data.executors[0];
                const s = e.systems[0];

                const payload = createFinishedPayload(data.id, s.system_name, status);
                const msg = createKafkaMessage(responseEnvelope(payload, e.receptor_job_id, e.receptor_node_id));
                await onMessage(msg);

                assertNoErrors();
                await assertRun(data.id, initial);
                await assertExecutor(e.id, initial);
                await assertSystem(s.id, initial);
            })
        );

        [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach((status) =>
            test(`executor state not updated until all systems finish (${status})`, async () => {
                const data = await insertPlaybookRun(undefined, 1, 2);
                const e = data.executors[0];

                const payload1 = createFinishedPayload(data.id, e.systems[0].system_name, status);
                const payload2 = createFinishedPayload(data.id, e.systems[1].system_name, status);

                await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
                assertNoErrors();
                await assertExecutor(e.id, Status.PENDING);
                await assertSystem(e.systems[0].id, status);

                await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
                assertNoErrors();
                await assertExecutor(e.id, status);
                await assertSystem(e.systems[1].id, status);
            })
        );

        [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach((status) =>
            test(`run state not updated until all systems finish (${status})`, async () => {
                const data = await insertPlaybookRun(undefined, 2, 1);

                const payload1 = createFinishedPayload(data.id, data.executors[0].systems[0].system_name, status);
                const payload2 = createFinishedPayload(data.id, data.executors[1].systems[0].system_name, status);

                await onMessage(createKafkaMessage(responseEnvelope(payload1, data.executors[0].receptor_job_id, data.executors[0].receptor_node_id)));
                assertNoErrors();
                await assertRun(data.id, Status.PENDING);
                await assertSystem(data.executors[0].systems[0].id, status);

                await onMessage(createKafkaMessage(responseEnvelope(payload2, data.executors[1].receptor_job_id, data.executors[1].receptor_node_id)));
                assertNoErrors();
                await assertRun(data.id, status);
                await assertSystem(data.executors[1].systems[0].id, status);
            })
        );

        test('if a system in canceled then the entire executor is canceled (assuming no failure)', async () => {
            const data = await insertPlaybookRun(undefined, 1, 2);
            const e = data.executors[0];

            const payload1 = createFinishedPayload(data.id, e.systems[0].system_name, Status.CANCELED);
            const payload2 = createFinishedPayload(data.id, e.systems[1].system_name, Status.SUCCESS);

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            assertNoErrors();
            await assertExecutor(e.id, Status.PENDING);
            await assertSystem(e.systems[0].id, Status.CANCELED);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
            assertNoErrors();
            await assertExecutor(e.id, Status.CANCELED);
            await assertSystem(e.systems[1].id, Status.SUCCESS);
        });

        test('if a system fails then the entire executor fails', async () => {
            const data = await insertPlaybookRun(undefined, 1, 3);
            const e = data.executors[0];

            const payload1 = createFinishedPayload(data.id, e.systems[0].system_name, Status.CANCELED);
            const payload2 = createFinishedPayload(data.id, e.systems[1].system_name, Status.FAILURE);
            const payload3 = createFinishedPayload(data.id, e.systems[2].system_name, Status.SUCCESS);

            await onMessage(createKafkaMessage(responseEnvelope(payload1, e.receptor_job_id, e.receptor_node_id)));
            assertNoErrors();
            await assertExecutor(e.id, Status.PENDING);
            await assertSystem(e.systems[0].id, Status.CANCELED);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, e.receptor_job_id, e.receptor_node_id)));
            assertNoErrors();
            await assertExecutor(e.id, Status.PENDING);
            await assertSystem(e.systems[1].id, Status.FAILURE);

            await onMessage(createKafkaMessage(responseEnvelope(payload3, e.receptor_job_id, e.receptor_node_id)));
            assertNoErrors();
            await assertExecutor(e.id, Status.FAILURE);
            await assertSystem(e.systems[2].id, Status.SUCCESS);
        });

        test('if a system is canceled then the entire run is canceled (assuming no failure)', async () => {
            const data = await insertPlaybookRun(undefined, 2, 1);

            const payload1 = createFinishedPayload(data.id, data.executors[0].systems[0].system_name, Status.CANCELED);
            const payload2 = createFinishedPayload(data.id, data.executors[1].systems[0].system_name, Status.SUCCESS);

            await onMessage(createKafkaMessage(responseEnvelope(payload1, data.executors[0].receptor_job_id, data.executors[0].receptor_node_id)));
            assertNoErrors();
            await assertRun(data.id, Status.PENDING);
            await assertSystem(data.executors[0].systems[0].id, Status.CANCELED);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, data.executors[1].receptor_job_id, data.executors[1].receptor_node_id)));
            assertNoErrors();
            await assertRun(data.id, Status.CANCELED);
            await assertSystem(data.executors[1].systems[0].id, Status.SUCCESS);
        });

        test('if a system fails then the entire run fails', async () => {
            const data = await insertPlaybookRun(undefined, 3, 1);

            const payload1 = createFinishedPayload(data.id, data.executors[0].systems[0].system_name, Status.CANCELED);
            const payload2 = createFinishedPayload(data.id, data.executors[1].systems[0].system_name, Status.FAILURE);
            const payload3 = createFinishedPayload(data.id, data.executors[2].systems[0].system_name, Status.SUCCESS);

            await onMessage(createKafkaMessage(responseEnvelope(payload1, data.executors[0].receptor_job_id, data.executors[0].receptor_node_id)));
            assertNoErrors();
            await assertRun(data.id, Status.PENDING);
            await assertSystem(data.executors[0].systems[0].id, Status.CANCELED);

            await onMessage(createKafkaMessage(responseEnvelope(payload2, data.executors[1].receptor_job_id, data.executors[1].receptor_node_id)));
            assertNoErrors();
            await assertRun(data.id, Status.PENDING);
            await assertSystem(data.executors[1].systems[0].id, Status.FAILURE);

            await onMessage(createKafkaMessage(responseEnvelope(payload3, data.executors[2].receptor_job_id, data.executors[2].receptor_node_id)));
            assertNoErrors();
            await assertRun(data.id, Status.FAILURE);
            await assertSystem(data.executors[2].systems[0].id, Status.SUCCESS);
        });
    });
});
