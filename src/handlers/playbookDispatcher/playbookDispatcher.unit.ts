import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';
import * as db from '../../db';
import { v4 as uuidv4 } from 'uuid';
import should from 'should';
import sinon from 'sinon';

describe('playbookDispatcher handler unit tests', function () {
    let sandbox: sinon.SinonSandbox;
    let dispatcherRunErrorParse: any;
    let createOrUpdateDispatcherRun: any;

    beforeEach(() => {
        sandbox = getSandbox();
        dispatcherRunErrorParse = sandbox.spy(probes, 'dispatcherRunErrorParse');
        createOrUpdateDispatcherRun = sandbox.stub(db, 'createOrUpdateDispatcherRun').resolves('updated');
    });

    afterEach(() => {
        sandbox.restore();
    });

    test('processes a valid update message', async () => {
        const runId = uuidv4();
        const status = 'success';

        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: JSON.stringify({
                event_type: 'update',
                payload: {
                    id: runId,
                    org_id: '5318290',
                    service: 'remediations',
                    labels: {}, // not used for update
                    status,
                    created_at: '2022-04-22T11:15:45.429294Z',
                    updated_at: '2022-04-22T11:15:45.429294Z'
                }
            }),
            headers: {
                event_type: 'update',
                service: 'remediations',
                status,
                org_id: '5318290'
            }
        };

        await handler(message);

        dispatcherRunErrorParse.called.should.be.false();
        createOrUpdateDispatcherRun.calledOnce.should.be.true();
        createOrUpdateDispatcherRun.calledWithMatch(
            sinon.match.any,
            runId,
            status,
            undefined // no remediation run id for update
        ).should.be.true();
    });

    test('ignores message when event_type is missing or not update/create', async () => {
        const runId = uuidv4();
        const message = {
            value: JSON.stringify({
                event_type: 'delete', // irrelevant event type
                payload: {
                    id: runId,
                    status: 'success',
                    labels: {}
                }
            }),
            headers: {
                event_type: 'delete',
                service: 'remediations'
            }
        };

        await handler(message);

        dispatcherRunErrorParse.called.should.be.false();
        createOrUpdateDispatcherRun.called.should.be.false();
    });

    test('logs parse error for invalid JSON', async () => {
        const message = {
            value: '{"event_type": "update", "payload": { "id": "abc123", "status": ',
            headers: {
                event_type: 'update',
                service: 'remediations'
            }
        };

        await handler(message);

        dispatcherRunErrorParse.calledOnce.should.be.true();
        dispatcherRunErrorParse.args[0][0].should.eql(message);
        dispatcherRunErrorParse.args[0][1].should.be.instanceOf(SyntaxError);
    });

    test('fails schema validation if "id" is missing', async () => {
        const message = {
            value: JSON.stringify({
                event_type: 'update',
                payload: {
                    status: 'success'
                }
            }),
            headers: {
                event_type: 'update',
                service: 'remediations'
            }
        };

        await handler(message);

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
    });

    test('create event without remediation run id triggers parse error', async () => {
        const message = {
            value: JSON.stringify({
                event_type: 'create',
                payload: {
                    id: uuidv4(),
                    status: 'running',
                    labels: {} // missing playbook-run label
                }
            }),
            headers: {
                event_type: 'create',
                service: 'remediations'
            }
        };

        await handler(message);

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
        dispatcherRunErrorParse.args[0][1].message.should.equal("Missing 'playbook-run' label in create event");
    });
});
