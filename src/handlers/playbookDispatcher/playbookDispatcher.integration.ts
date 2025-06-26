import { DispatcherRun } from '../models';
import { getSandbox } from '../../../test';
import playbookDispatcher from '.';
import * as db from '../../db';
import * as probes from '../../probes';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';
import should from 'should';

let remediationRunId: string;
let playbookRunId: string;

const buildMessage = (
    status: string,
    eventType: string = 'update',
    runId: string = playbookRunId,
    remRunId: string = remediationRunId
) => ({
    topic: 'platform.playbook-dispatcher.runs',
    value: JSON.stringify({
        event_type: eventType,
        payload: {
            id: runId,
            org_id: '5318290',
            service: 'remediations',
            labels: {
                'playbook-run': remRunId
            },
            status,
            created_at: '2022-04-22T11:15:45.429294Z',
            updated_at: '2022-04-22T11:15:45.429294Z'
        }
    }),
    offset: 0,
    partition: 58,
    highWaterOffset: 1,
    key: runId,
    headers: {
        event_type: eventType,
        service: 'remediations',
        status,
        org_id: '5318290'
    }
});

const setupPlaybookRun = async () => {
    remediationRunId = uuidv4();
    playbookRunId = uuidv4();

    await db.get()('playbook_runs').insert({
        id: remediationRunId,
        status: 'running',
        remediation_id: uuidv4(),
        created_by: 'tester',
        created_at: new Date(),
        updated_at: new Date()
    });
};

const setupCreateTest = async () => {
    await setupPlaybookRun();
};

const setupUpdateTest = async () => {
    await setupPlaybookRun();

    await db.get()(DispatcherRun.TABLE).insert({
        [DispatcherRun.dispatcher_run_id]: playbookRunId,
        [DispatcherRun.status]: 'running',
        [DispatcherRun.remediations_run_id]: remediationRunId,
        created_at: new Date(),
        updated_at: new Date()
    });
};

describe('playbookDispatcher handler integration tests', function () {
    test('create event with running status', async () => {
        await setupCreateTest();

        const message = buildMessage('running', 'create');
        const spy = getSandbox().spy(probes, 'dispatcherRunSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'running').should.be.true();

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        result.status.should.equal('running');
    });

    test('update to success', async () => {
        await setupUpdateTest();

        const message = buildMessage('success');
        const spy = getSandbox().spy(probes, 'dispatcherRunSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'success').should.be.true();

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        result.status.should.equal('success');
    });

    test('update to failure', async () => {
        await setupUpdateTest();

        const message = buildMessage('failure');
        const spy = getSandbox().spy(probes, 'dispatcherRunSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'failure').should.be.true();

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        result.status.should.equal('failure');
    });

    test('update to timeout', async () => {
        await setupUpdateTest();

        const message = buildMessage('timeout');
        const spy = getSandbox().spy(probes, 'dispatcherRunSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'timeout').should.be.true();

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        result.status.should.equal('timeout');
    });

    test('update with invalid status triggers error parse probe', async () => {
        await setupUpdateTest();

        const message = buildMessage('invalid-status');
        const spy = getSandbox().spy(probes, 'dispatcherRunErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(message, sinon.match.instanceOf(Error)).should.be.true();
    });

    test('create event missing playbook-run label triggers schema validation failure', async () => {
        await setupCreateTest();

        const message = buildMessage('success');
        const parsed = JSON.parse(message.value);
        delete parsed.payload.labels['playbook-run'];
        message.value = JSON.stringify(parsed);

        const spy = getSandbox().spy(probes, 'dispatcherRunErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.args[0][1].message.should.equal('child "labels" fails because [child "playbook-run" fails because ["playbook-run" is required]]');

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        should(result).be.undefined();
    });

    test('update event missing playbook-run label triggers schema validation failure', async () => {
        await setupCreateTest();

        const message = buildMessage('running', 'create');
        const parsed = JSON.parse(message.value);
        delete parsed.payload.labels['playbook-run'];
        message.value = JSON.stringify(parsed);

        const spy = getSandbox().spy(probes, 'dispatcherRunErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.args[0][1].message.should.equal('child "labels" fails because [child "playbook-run" fails because ["playbook-run" is required]]');

        const result = await db.get()('dispatcher_runs')
            .where({ dispatcher_run_id: playbookRunId })
            .first();

        should(result).be.undefined();
    });

    test('handles DB errors by calling update error probe', async () => {
        await setupUpdateTest();

        const message = buildMessage('success');
        const spy = getSandbox().spy(probes, 'dispatcherRunError');

        getSandbox().stub(db, 'createOrUpdateDispatcherRun').throws(new Error('DB error'));

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'success', sinon.match.instanceOf(Error)).should.be.true();
    });

    test('handles malformed JSON payload', async () => {
        const message = { value: 'invalid JSON', headers: { event_type: 'update' } };
        const spy = getSandbox().spy(probes, 'dispatcherRunErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(message, sinon.match.instanceOf(SyntaxError)).should.be.true();
    });

    test('simulate concurrent invocations', async () => {
        await setupPlaybookRun();

        const runId1 = uuidv4();
        const runId2 = uuidv4();
        const runId3 = uuidv4();

        await db.get()('dispatcher_runs').insert([
            {
                dispatcher_run_id: runId1,
                status: 'running',
                created_at: new Date(),
                updated_at: new Date(),
                remediations_run_id: remediationRunId
            },
            {
                dispatcher_run_id: runId2,
                status: 'running',
                created_at: new Date(),
                updated_at: new Date(),
                remediations_run_id: remediationRunId
            },
            {
                dispatcher_run_id: runId3,
                status: 'running',
                created_at: new Date(),
                updated_at: new Date(),
                remediations_run_id: remediationRunId
            }
        ]);

        const messages = [
            buildMessage('success', 'update', runId1, remediationRunId),
            buildMessage('failure', 'update', runId2, remediationRunId),
            buildMessage('running', 'update', runId3, remediationRunId)
        ];

        const spy = getSandbox().spy(probes, 'dispatcherRunSuccess');

        await Promise.all(messages.map(playbookDispatcher));

        spy.callCount.should.equal(3);
        spy.calledWithExactly(runId1, 'success').should.be.true();
        spy.calledWithExactly(runId2, 'failure').should.be.true();
        spy.calledWithExactly(runId3, 'running').should.be.true();
    });
});
