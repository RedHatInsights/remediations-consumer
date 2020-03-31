import '../../test';
import { insertPlaybookRun, assertSystem, assertExecutor, assertRun } from '../../test/playbookRuns';
import { cancelSystems, cancelExecutors, cancelRuns } from './queries';
import * as db from '../db';
import { Status } from '../handlers/receptor/models';

describe('sat-receptor cleaner script', function () {
    describe('cancelSystems', function () {
        [Status.PENDING, Status.RUNNING].forEach(status =>
            test(`cancels a system that is ${status}`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = status;
                });

                await cancelSystems(db.get());
                await assertSystem(data.executors[0].systems[0].id, Status.CANCELED);
            })
        );

        [Status.SUCCESS, Status.FAILURE].forEach(status =>
            test(`does not cancel a system that is ${status}`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = status;
                });

                await cancelSystems(db.get());
                await assertSystem(data.executors[0].systems[0].id, status);
            })
        );

        [Status.PENDING, Status.RUNNING, Status.SUCCESS, Status.FAILURE].forEach(status =>
            test(`does not cancel a recently updated system that is ${status}`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].systems[0].updated_at = new Date().toISOString();
                    run.executors[0].systems[0].status = status;
                });

                await cancelSystems(db.get());
                await assertSystem(data.executors[0].systems[0].id, status);
            })
        );
    });

    describe('cancelExecutor', function () {
        [Status.PENDING, Status.ACKED, Status.RUNNING].forEach(initialStatus =>
            [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach(expectedStatus => {
                test(`transitions a finished executor from ${initialStatus} to ${expectedStatus}`, async () => {
                    const data = await insertPlaybookRun(run => {
                        run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                        run.executors[0].status = initialStatus;
                        run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                        run.executors[0].systems[0].status = expectedStatus;
                    });

                    await cancelExecutors(db.get());
                    await assertExecutor(data.executors[0].id, expectedStatus);
                });
            })
        );

        [Status.CANCELED, Status.FAILURE].forEach(expectedStatus =>
            test(`${expectedStatus} systems determine the executor status`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.RUNNING;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[0].systems[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[1].status = Status.CANCELED;
                    run.executors[0].systems[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[2].status = expectedStatus;
                }, 1, 3);

                await cancelExecutors(db.get());
                await assertExecutor(data.executors[0].id, expectedStatus);
            })
        );

        [Status.PENDING, Status.RUNNING].forEach(systemStatus =>
            test(`does not finish an executor if not all systems are finished`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.RUNNING;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[0].systems[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[1].status = Status.SUCCESS;
                    run.executors[0].systems[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[2].status = systemStatus;
                }, 1, 3);

                await cancelExecutors(db.get());
                await assertExecutor(data.executors[0].id, Status.RUNNING);
            })
        );

        [Status.CANCELED, Status.FAILURE].forEach(systemStatus =>
            test(`does not finish an already finished executor`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.SUCCESS;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[0].systems[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[1].status = Status.SUCCESS;
                    run.executors[0].systems[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[2].status = systemStatus;
                }, 1, 3);

                await cancelExecutors(db.get());
                await assertExecutor(data.executors[0].id, Status.SUCCESS);
            })
        );

        [Status.RUNNING, Status.PENDING, Status.ACKED].forEach(status =>
            test(`does not finish a freshly updated executor`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.executors[0].updated_at = new Date().toISOString();
                    run.executors[0].status = status;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                });

                await cancelExecutors(db.get());
                await assertExecutor(data.executors[0].id, status);
            })
        );
    });

    describe('cancelRun', function () {
        [Status.PENDING, Status.RUNNING].forEach(initialStatus =>
            [Status.SUCCESS, Status.FAILURE, Status.CANCELED].forEach(expectedStatus => {
                test(`transitions a finished run from ${initialStatus} to ${expectedStatus}`, async () => {
                    const data = await insertPlaybookRun(run => {
                        run.updated_at = '2020-01-01 00:00:00.000+00';
                        run.status = initialStatus;
                        run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                        run.executors[0].status = expectedStatus;
                        run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                        run.executors[0].systems[0].status = expectedStatus;
                    });

                    await cancelRuns(db.get());
                    await assertRun(data.id, expectedStatus);
                });
            })
        );

        [Status.CANCELED, Status.FAILURE].forEach(expectedStatus =>
            test(`${expectedStatus} executors determine the run status`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.updated_at = '2020-01-01 00:00:00.000+00';
                    run.status = Status.RUNNING;
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.SUCCESS;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].status = Status.SUCCESS;
                    run.executors[1].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].systems[0].status = Status.SUCCESS;
                    run.executors[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].status = expectedStatus;
                    run.executors[2].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].systems[0].status = expectedStatus;
                }, 3, 1);

                await cancelRuns(db.get());
                await assertRun(data.id, expectedStatus);
            })
        );

        [Status.PENDING, Status.ACKED, Status.RUNNING].forEach(executorStatus =>
            test(`does not finish a run if not all executors are finished`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.updated_at = '2020-01-01 00:00:00.000+00';
                    run.status = Status.RUNNING;
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.SUCCESS;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].status = executorStatus;
                    run.executors[1].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].systems[0].status = Status.RUNNING;
                    run.executors[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].status = Status.SUCCESS;
                    run.executors[2].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].systems[0].status = Status.SUCCESS;
                }, 3, 1);

                await cancelRuns(db.get());
                await assertRun(data.id, Status.RUNNING);
            })
        );

        [Status.CANCELED, Status.FAILURE].forEach(executorStatus =>
            test(`does not finish an already finished run`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.updated_at = '2020-01-01 00:00:00.000+00';
                    run.status = Status.SUCCESS;
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.SUCCESS;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                    run.executors[1].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].status = executorStatus;
                    run.executors[1].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[1].systems[0].status = Status.RUNNING;
                    run.executors[2].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].status = Status.SUCCESS;
                    run.executors[2].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[2].systems[0].status = Status.SUCCESS;
                }, 3, 1);

                await cancelRuns(db.get());
                await assertRun(data.id, Status.SUCCESS);
            })
        );

        [Status.RUNNING, Status.PENDING].forEach(status =>
            test(`does not finish a freshly updated run`, async () => {
                const data = await insertPlaybookRun(run => {
                    run.updated_at = new Date().toISOString();
                    run.status = status;
                    run.executors[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].status = Status.SUCCESS;
                    run.executors[0].systems[0].updated_at = '2020-01-01 00:00:00.000+00';
                    run.executors[0].systems[0].status = Status.SUCCESS;
                });

                await cancelRuns(db.get());
                await assertRun(data.id, status);
            })
        );
    });
});
