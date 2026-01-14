/* eslint-disable no-unused-vars */
export enum Status {
    PENDING = 'pending',
    ACKED = 'acked',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILURE = 'failure',
    CANCELED = 'canceled'
}

export enum RemediationIssues {
    TABLE = 'remediation_issues',
    id = 'id',
    issue_id = 'issue_id',
    remediation_id = 'remediation_id',
    resolution = 'resolution'
}

export enum RemediationIssueSystems {
    TABLE = 'remediation_issue_systems',
    remediation_issue_id = 'remediation_issue_id',
    system_id = 'system_id',
    resolved = 'resolved'
}

export enum PlaybookRun {
    TABLE = 'playbook_runs',
    id = 'id',
    status = 'status',
    updated_at = 'updated_at'
}

export enum DispatcherRun {
    TABLE = 'dispatcher_runs',
    dispatcher_run_id = 'dispatcher_run_id',
    remediations_run_id = 'remediations_run_id',
    status = 'status',
    created_at = 'created_at',
    updated_at = 'updated_at'
}
