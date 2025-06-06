import { getSandbox } from '../../../test';
import handler from '.';
import * as probes from '../../probes';
import * as db from '../../db';
import { v4 as uuidv4 } from 'uuid';

describe('playbookDispatcher handler unit tests', function () {
    let playbookUpdateErrorParse: any;
    let updatePlaybookRunStatus: any;

    beforeEach(() => {
        const sandbox = getSandbox();
        playbookUpdateErrorParse = sandbox.spy(probes, 'playbookUpdateErrorParse');
        updatePlaybookRunStatus = sandbox.stub(db, 'updatePlaybookRunStatus').resolves(1);
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
                        remediation_id: 'some-remediation-id',
                    },
                    status,
                    created_at: '2022-04-22T11:15:45.429294Z',
                    updated_at: '2022-04-22T11:15:45.429294Z',
                }
            }),
            offset: 0,
            partition: 1,
            highWaterOffset: 2,
            key: runId,
            headers: {
                event_type: 'update',
                service: 'remediations',
                status,
                org_id: '5318290',
            }
        };

        await handler(message);
        playbookUpdateErrorParse.callCount.should.equal(0);
    });

    test('ignores message when event_type !== update', async () => {
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
                    labels: {
                        remediation_id: 'some-remediation-id'
                    },
                    status,
                    created_at: '2022-04-22T11:15:45.429294Z',
                    updated_at: '2022-04-22T11:15:45.429294Z'
                }
            }),
            offset: 0,
            partition: 1,
            highWaterOffset: 2,
            key: runId,
            headers: {
                event_type: 'create',
                service: 'remediations',
                status,
                org_id: '5318290',
            }
        };

        await handler(message);
        playbookUpdateErrorParse.callCount.should.equal(0);
    });

    test('logs parse error for invalid JSON', async () => {
        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: '{"event_type": "update", "payload": { "id": "abc123", "status": ',
            offset: 0,
            partition: 1,
            highWaterOffset: 2,
            key: undefined,
            headers: {
                event_type: 'update',
                service: 'remediations',
                org_id: '5318290'
            }
        };

        await handler(message);

        playbookUpdateErrorParse.callCount.should.equal(1);
    });

    test('fails schema validation if "id" is missing', async () => {
        const message = {
            topic: 'platform.playbook-dispatcher.runs',
            value: JSON.stringify({
                event_type: 'update',
                payload: {
                    status: 'success'
                }
            }),
            offset: 0,
            partition: 1,
            highWaterOffset: 2,
            key: undefined,
            headers: {
                event_type: 'update',
                service: 'remediations',
                org_id: '5318290'
            }
        };

        await handler(message);

        updatePlaybookRunStatus.called.should.be.false();
        playbookUpdateErrorParse.called.should.be.true();
    });
});
