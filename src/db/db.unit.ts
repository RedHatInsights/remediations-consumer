import { updateIssues } from './index';
import { Knex } from 'knex';
import * as sinon from 'sinon';
import should from 'should';

describe('db.updateIssues SQL injection prevention', () => {
    let mockKnex: sinon.SinonStubbedInstance<Knex>;

    beforeEach(() => {
        mockKnex = {
            raw: sinon.stub().resolves({ rowCount: 1 })
        } as any;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('proper parameterization', () => {
        test('single issue creates one placeholder', async () => {
            await updateIssues(mockKnex as any, 'host-123', ['advisor:CVE-2017'], 'advisor%');

            const call = (mockKnex.raw as sinon.SinonStub).getCall(0);
            call.args[0].should.containEql('NOT IN (?)');
            call.args[1].should.eql(['advisor:CVE-2017', 'advisor%', 'host-123']);
        });

        test('multiple issues create multiple placeholders', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['advisor:CVE-2017', 'advisor:CVE-2018', 'advisor:CVE-2019'],
                'advisor%'
            );

            const call = (mockKnex.raw as sinon.SinonStub).getCall(0);
            call.args[0].should.containEql('NOT IN (?,?,?)');
            call.args[1].should.eql([
                'advisor:CVE-2017',
                'advisor:CVE-2018',
                'advisor:CVE-2019',
                'advisor%',
                'host-123'
            ]);
        });

        test('empty array uses TRUE clause', async () => {
            await updateIssues(mockKnex as any, 'host-123', [], 'advisor%');

            const call = (mockKnex.raw as sinon.SinonStub).getCall(0);
            call.args[0].should.containEql('TRUE');
            call.args[1].should.eql(['advisor%', 'host-123']);
        });
    });

    describe('SQL injection prevention', () => {
        test('rejects classic SQL injection with DROP TABLE', async () => {
            const maliciousIssue = 'advisor:CVE\'; DROP TABLE remediation_issues; --';

            await should(
                updateIssues(mockKnex as any, 'host-123', [maliciousIssue], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);

            (mockKnex.raw as sinon.SinonStub).called.should.be.false();
        });

        test('rejects UNION-based injection', async () => {
            const maliciousIssue = '\' UNION SELECT password FROM users--';

            await should(
                updateIssues(mockKnex as any, 'host-123', [maliciousIssue], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects authentication bypass attempt', async () => {
            const maliciousIssue = '\' OR \'1\'=\'1';

            await should(
                updateIssues(mockKnex as any, 'host-123', [maliciousIssue], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects issue with single quotes', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', ['test\'quote'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects issue with double quotes', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', ['test"quote'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects issue with semicolons', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', ['test;command'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects issue with backslashes', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', ['test\\escape'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects SQL comment markers', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', ['test--comment'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);

            await should(
                updateIssues(mockKnex as any, 'host-123', ['test/*comment*/'], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });
    });

    describe('valid issue ID formats', () => {
        test('accepts advisor format', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074'],
                'advisor%'
            );
            (mockKnex.raw as sinon.SinonStub).called.should.be.true();
        });

        test('accepts ssg format', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled'],
                'ssg%'
            );
            (mockKnex.raw as sinon.SinonStub).called.should.be.true();
        });

        test('accepts patch format', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['patch:RHBA-2019:0689'],
                'patch%'
            );
            (mockKnex.raw as sinon.SinonStub).called.should.be.true();
        });

        test('accepts vulnerabilities format', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['vulnerabilities:CVE-2018-5716'],
                'vulnerabilities%'
            );
            (mockKnex.raw as sinon.SinonStub).called.should.be.true();
        });
    });

    describe('edge cases', () => {
        test('rejects excessively long issue ID (DoS prevention)', async () => {
            const longIssue = 'a'.repeat(501);
            await should(
                updateIssues(mockKnex as any, 'host-123', [longIssue], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('rejects empty string issue', async () => {
            await should(
                updateIssues(mockKnex as any, 'host-123', [''], 'advisor%')
            ).be.rejectedWith(/Invalid issue IDs detected/);
        });

        test('handles mix of valid and invalid issues', async () => {
            await should(
                updateIssues(
                    mockKnex as any,
                    'host-123',
                    ['advisor:CVE-2017', 'malicious\'; DROP TABLE users;'],
                    'advisor%'
                )
            ).be.rejectedWith(/Invalid issue IDs detected/);

            // Ensure no partial execution
            (mockKnex.raw as sinon.SinonStub).called.should.be.false();
        });

        test('handles large number of valid issues', async () => {
            const issues = Array.from({ length: 100 }, (_, i) =>
                `advisor:CVE-2017-${i.toString().padStart(5, '0')}`
            );

            await updateIssues(mockKnex as any, 'host-123', issues, 'advisor%');

            const call = (mockKnex.raw as sinon.SinonStub).getCall(0);
            const placeholders = issues.map(() => '?').join(',');
            call.args[0].should.containEql(`NOT IN (${placeholders})`);
            call.args[1].should.eql([...issues, 'advisor%', 'host-123']);
        });

        test('accepts issues with hyphens and underscores', async () => {
            await updateIssues(
                mockKnex as any,
                'host-123',
                ['advisor:CVE-2017_6074-test'],
                'advisor%'
            );
            (mockKnex.raw as sinon.SinonStub).called.should.be.true();
        });
    });
});
