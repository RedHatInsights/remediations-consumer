import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';
import * as db from '../../db';
import { v4 as uuidv4 } from 'uuid';
import sinon from 'sinon';

describe('playbookDispatcher handler unit tests', function () {
    let sandbox: sinon.SinonSandbox;
    let dispatcherRunErrorParse: any;
    let createOrUpdateDispatcherRun: any;

    beforeEach(() => {
        sandbox = getSandbox();
        dispatcherRunErrorParse = sandbox.spy(probes, 'dispatcherRunErrorParse');
        createOrUpdateDispatcherRun = sandbox.stub(db, 'createOrUpdateDispatcherRun').resolves();
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
                    labels: {
                        'playbook-run': '88d0ba73-0015-4e7d-a6d6-4b530cbfb5bc'
                    },
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
            '88d0ba73-0015-4e7d-a6d6-4b530cbfb5bc'
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
                    service: 'remediations',
                    labels: {
                        'playbook-run': '88d0ba73-0015-4e7d-a6d6-4b530cbfb5bc'
                    }
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
        const status = 'success';

        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: JSON.stringify({
                event_type: 'update',
                payload: {
                    org_id: '5318290',
                    service: 'remediations',
                    labels: {
                        'playbook-run': '88d0ba73-0015-4e7d-a6d6-4b530cbfb5bc'
                    },
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

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
    });

    test('create event without remediation run id triggers parse error', async () => {
        const runId = uuidv4();
        const status = 'running';

        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: JSON.stringify({
                event_type: 'create',
                payload: {
                    id: runId,
                    org_id: '5318290',
                    service: 'remediations',
                    labels: {},
                    status,
                    created_at: '2022-04-22T11:15:45.429294Z',
                    updated_at: '2022-04-22T11:15:45.429294Z'
                }
            }),
            headers: {
                event_type: 'create',
                service: 'remediations',
                status,
                org_id: '5318290'
            }
        };

        await handler(message);

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
        dispatcherRunErrorParse.args[0][1].message.should.equal("child \"labels\" fails because [child \"playbook-run\" fails because [\"playbook-run\" is required]]");
    });

    test('update event without remediation run id triggers parse error', async () => {
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
                    labels: {},
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

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
        dispatcherRunErrorParse.args[0][1].message.should.equal("child \"labels\" fails because [child \"playbook-run\" fails because [\"playbook-run\" is required]]");
    });

    test('update event without service triggers parse error', async () => {
        const runId = uuidv4();
        const status = 'success';

        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: JSON.stringify({
                event_type: 'update',
                payload: {
                    id: runId,
                    org_id: '5318290',
                    labels: {},
                    status,
                    created_at: '2022-04-22T11:15:45.429294Z',
                    updated_at: '2022-04-22T11:15:45.429294Z'
                }
            }),
            headers: {
                event_type: 'update',
                status,
                org_id: '5318290'
            }
        };

        await handler(message);

        createOrUpdateDispatcherRun.called.should.be.false();
        dispatcherRunErrorParse.calledOnce.should.be.true();
    });
});
