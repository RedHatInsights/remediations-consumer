import {v4} from 'uuid';
import { Status, PlaybookRunExecutor, PlaybookRun, PlaybookRunSystem } from '../src/handlers/receptor/models';
import * as db from '../src/db';
import * as P from 'bluebird';
import * as _ from 'lodash';

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

export async function insertPlaybookRun (transform = (f: any) => f, executors = 1, systems = 1) {
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

export async function assertRun (id: string, status = Status.PENDING) {
    const run = await getRun(id);
    run.status.should.equal(status);
}

export async function assertExecutor (id: string, status = Status.PENDING) {
    const executor = await getExecutor(id);
    executor.status.should.equal(status);
}

export async function assertSystem (id: string, status = Status.PENDING, sequence = DEFAULT_SEQUENCE, console = DEFAULT_CONSOLE) {
    const system = await getSystem(id);
    system.status.should.equal(status);
    system.sequence.should.equal(sequence);
    system.console.should.equal(console);
}
