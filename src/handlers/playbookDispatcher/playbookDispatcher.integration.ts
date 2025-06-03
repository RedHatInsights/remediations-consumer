import { RemediationIssueSystems, RemediationIssues, PlaybookRun } from '../models';
import { getSandbox } from '../../../test';
import playbookDispatcher from '.';
import * as db from '../../db';
import * as probes from '../../probes';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

let remediationId: string;
let playbookRunId: string;

const buildMessage = (status: string, runId: string = playbookRunId) => ({
    topic: 'platform.playbook-dispatcher.runs',
    value: JSON.stringify({
        event_type: 'update',
        payload: {
            id: runId,
            org_id: '5318290',
            service: 'remediations',
            labels: {
                remediation_id: remediationId
            },
            status: status,
            created_at: '2022-04-22T11:15:45.429294Z',
            updated_at: '2022-04-22T11:15:45.429294Z'
        }
    }),
    offset: 0,
    partition: 58,
    highWaterOffset: 1,
    key: runId,
    headers: {
        event_type: 'update',
        service: 'remediations',
        status: status,
        org_id: '5318290'
    }
});

describe('playbookDispatcher handler integration tests', function () {
    beforeEach(async () => {
        remediationId = uuidv4();
        playbookRunId = uuidv4();

        await db.get()(PlaybookRun.TABLE).insert({
            [PlaybookRun.id]: playbookRunId,
            [PlaybookRun.status]: 'running',
            updated_at: new Date('2022-04-22T11:15:45.429294Z'),
            created_by: 'test@redhat.com',
            remediation_id: remediationId
        });
    });
    test('update to success', async () => {
        const message = buildMessage('success');
        const spy = getSandbox().spy(probes, 'playbookUpdateSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'success').should.be.true();

        const result = await db.get()('playbook_runs')
            .where({ id: playbookRunId })
            .first();

        result.status.should.equal('success');
    });

    test('update to failure', async () => {
        const message = buildMessage('failure');
        const spy = getSandbox().spy(probes, 'playbookUpdateSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'failure').should.be.true();

        const result = await db.get()('playbook_runs')
            .where({ id: playbookRunId })
            .first();

        result.status.should.equal('failure');
    });

    test('update to timeout', async () => {
        const message = buildMessage('timeout');
        const spy = getSandbox().spy(probes, 'playbookUpdateSuccess');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'timeout').should.be.true();
        const result = await db.get()('playbook_runs')
            .where({ id: playbookRunId })
            .first();

        result.status.should.equal('timeout');
    });

    test('update with invalid status triggers error parse probe', async () => {
        const message = buildMessage('invalid-status');
        const spy = getSandbox().spy(probes, 'playbookUpdateErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(message, sinon.match.instanceOf(Error), 'invalid-status').should.be.true();
    });

    test('unknown  playbook run id triggers host unknown probe', async () => {
        const message = buildMessage('success');
        const parsed = JSON.parse(message.value);
        parsed.payload.id = 'd3b07384-d9a0-4f10-bde0-1d8fdf2e44c2';
        message.value = JSON.stringify(parsed);

        const spy = getSandbox().spy(probes, 'playbookRunUnknown');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly('d3b07384-d9a0-4f10-bde0-1d8fdf2e44c2', 'success').should.be.true();
    });

    test('handles DB errors by calling update error probe', async () => {
        const message = buildMessage('success');
        const spy = getSandbox().spy(probes, 'playbookUpdateError');

        getSandbox().stub(db, 'updatePlaybookRunStatus').throws(new Error('DB error'));

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(playbookRunId, 'success', sinon.match.instanceOf(Error)).should.be.true();
    });

    test('handles malformed JSON payload', async () => {
        const message = { value: 'invalid JSON', headers: { event_type: 'update' } };
        const spy = getSandbox().spy(probes, 'playbookUpdateErrorParse');

        await playbookDispatcher(message);

        spy.calledOnce.should.be.true();
        spy.calledWithExactly(message, sinon.match.instanceOf(SyntaxError)).should.be.true();
    });

    test('simulate concurrent invocations', async () => {
        const runId1 = uuidv4();
        const runId2 = uuidv4();
        const runId3 = uuidv4();

        await Promise.all([
            db.get()('playbook_runs').insert({
                id: runId1,
                status: 'running',
                updated_at: new Date(),
                created_by: 'test@redhat.com',
                remediation_id: remediationId
            }),
            db.get()('playbook_runs').insert({
                id: runId2,
                status: 'running',
                updated_at: new Date(),
                created_by: 'test@redhat.com',
                remediation_id: remediationId
            }),
            db.get()('playbook_runs').insert({
                id: runId3,
                status: 'running',
                updated_at: new Date(),
                created_by: 'test@redhat.com',
                remediation_id: remediationId
            })
        ]);

        const messages = [
            buildMessage('success', runId1),
            buildMessage('failure', runId2),
            buildMessage('running', runId3)
        ];

        const spy = getSandbox().spy(probes, 'playbookUpdateSuccess');

        await Promise.all(messages.map(playbookDispatcher));

        spy.callCount.should.equal(3);
        spy.calledWithExactly(runId1, 'success').should.be.true();
        spy.calledWithExactly(runId2, 'failure').should.be.true();
        spy.calledWithExactly(runId3, 'running').should.be.true();
    });
});
