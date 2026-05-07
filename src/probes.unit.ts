import * as sinon from 'sinon';
import * as probes from './probes';
import log from './util/log';
import { Message } from 'kafkajs';
import 'should';

describe('probes unit tests', function () {
    let sandbox: sinon.SinonSandbox;
    let logErrorSpy: sinon.SinonSpy;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        logErrorSpy = sandbox.spy(log, 'error');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('sanitizeMessageForLogging', () => {
        test('handles small messages without truncation', () => {
            const message: Message = {
                value: Buffer.from('{"host_id": "test-123", "issues": ["patch:RHBA-2019:0689"]}'),
                partition: 5,
                timestamp: '1234567890',
                key: null
            };

            const result = probes.sanitizeMessageForLogging(message);

            result.partition!.should.equal(5);
            result.timestamp!.should.equal('1234567890');
            result.size.should.equal(59);
            result.valueTruncated.should.equal('{"host_id": "test-123", "issues": ["patch:RHBA-2019:0689"]}');
            result.hasKey.should.equal(false);
        });

        test('truncates large messages at 1000 characters by default', () => {
            // Create a message larger than 1000 characters
            const largePayload = '{"host_id": "test-123", "data": "' + 'x'.repeat(2000) + '"}';
            const message: Message = {
                value: Buffer.from(largePayload),
                partition: 10,
                timestamp: '1234567890',
                key: Buffer.from('some-key')
            };

            const result = probes.sanitizeMessageForLogging(message);

            result.partition!.should.equal(10);
            result.timestamp!.should.equal('1234567890');
            result.size.should.equal(largePayload.length);
            result.valueTruncated.should.have.length(1003); // 1000 chars + '...'
            result.valueTruncated.should.endWith('...');
            result.valueTruncated.should.startWith('{"host_id": "test-123"');
            result.hasKey.should.equal(true);
        });

        test('truncates very large messages (simulating production issue)', () => {
            // Simulate a 5MB message from Patch
            const massivePayload = '{"host_id": "test-123", "issues": [' +
                Array(100000).fill('"patch:RHBA-2019:0689"').join(',') +
                ']}';
            const message: Message = {
                value: Buffer.from(massivePayload),
                partition: 58,
                timestamp: '1234567890',
                key: null
            };

            const result = probes.sanitizeMessageForLogging(message);

            result.size.should.be.above(1000000); // Should be over 1MB
            result.valueTruncated.should.have.length(1003); // Still only 1000 chars + '...'
            result.valueTruncated.should.endWith('...');
            result.valueTruncated.should.startWith('{"host_id": "test-123"');
        });

        test('handles custom maxLength parameter', () => {
            const payload = '{"data": "' + 'y'.repeat(500) + '"}';
            const message: Message = {
                value: Buffer.from(payload),
                partition: 1,
                timestamp: '1234567890',
                key: null
            };

            const result = probes.sanitizeMessageForLogging(message, 100);

            result.valueTruncated.should.have.length(103); // 100 chars + '...'
            result.valueTruncated.should.endWith('...');
        });

        test('handles null value', () => {
            const message: Message = {
                value: null,
                partition: 1,
                timestamp: '1234567890',
                key: null
            };

            const result = probes.sanitizeMessageForLogging(message);

            result.size.should.equal(0);
            result.valueTruncated.should.equal('');
        });

        test('handles string value (not Buffer)', () => {
            const message: Message = {
                value: '{"host_id": "test-123"}',
                partition: 1,
                timestamp: '1234567890',
                key: null
            };

            const result = probes.sanitizeMessageForLogging(message);

            result.size.should.equal(23);
            result.valueTruncated.should.equal('{"host_id": "test-123"}');
        });
    });

    describe('error parse functions with large messages', () => {
        test('patchUpdateErrorParse logs truncated message for oversized payload', () => {
            const largePayload = '{"host_id": "test-123", "issues": [' +
                Array(50000).fill('"patch:RHBA-2019:0689"').join(',') +
                ']}';
            const message: Message = {
                value: Buffer.from(largePayload),
                partition: 58,
                timestamp: '1234567890',
                key: null
            };
            const error = new Error('Message too large');

            probes.patchUpdateErrorParse(message, error);

            logErrorSpy.callCount.should.equal(1);
            const loggedData = logErrorSpy.firstCall.args[0];
            loggedData.message.should.have.property('valueTruncated');
            loggedData.message.valueTruncated.should.have.length(1003); // 1000 + '...'
            loggedData.message.should.have.property('size');
            loggedData.message.size.should.be.above(1000000);
            loggedData.err.should.equal(error);
        });

        test('inventoryErrorParse logs truncated message', () => {
            const largePayload = 'x'.repeat(5000);
            const message: Message = {
                value: Buffer.from(largePayload),
                partition: 1,
                timestamp: '1234567890',
                key: null
            };
            const error = new Error('Parse error');

            probes.inventoryErrorParse(message, error);

            logErrorSpy.callCount.should.equal(1);
            const loggedData = logErrorSpy.firstCall.args[0];
            loggedData.message.valueTruncated.should.have.length(1003);
            loggedData.message.size.should.equal(5000);
        });
    });
});
