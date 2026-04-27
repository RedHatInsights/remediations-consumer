import log from '../util/log';

export const ISSUE_ID_PATTERN = /^[a-zA-Z0-9_:|.\-\s]+$/;
export const MAX_ISSUE_ID_LENGTH = 500;
export const MAX_ISSUES_ARRAY_SIZE = 1000;

export function validateIssueId(issueId: string): boolean {
    if (typeof issueId !== 'string' || issueId.length === 0) {
        return false;
    }

    if (issueId.length > MAX_ISSUE_ID_LENGTH) {
        log.warn({ issueId: issueId.substring(0, 100) + '...' }, 'Issue ID exceeds maximum length');
        return false;
    }

    if (!ISSUE_ID_PATTERN.test(issueId)) {
        log.warn({ issueId }, 'Issue ID contains invalid characters');
        return false;
    }

    if (issueId.includes('--') || issueId.includes('/*') || issueId.includes('*/')) {
        log.warn({ issueId }, 'Issue ID contains SQL comment markers');
        return false;
    }

    return true;
}