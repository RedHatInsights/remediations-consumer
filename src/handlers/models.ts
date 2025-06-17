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

export enum PlaybookRunExecutor {
    TABLE = 'playbook_run_executors',
    id = 'id',
    playbook_run_id = 'playbook_run_id',
    receptor_job_id = 'receptor_job_id',
    receptor_node_id = 'receptor_node_id',
    status = 'status',
    updated_at = 'updated_at',
    version = 'version',
    text_update_full = 'text_update_full',
    satellite_connection_code = 'satellite_connection_code',
    satellite_connection_error = 'satellite_connection_error',
    satellite_infrastructure_code = 'satellite_infrastructure_code',
    satellite_infrastructure_error = 'satellite_infrastructure_error',
}

export enum PlaybookRunSystem {
    TABLE = 'playbook_run_systems',
    id = 'id',
    playbook_run_executor_id = 'playbook_run_executor_id',
    sequence = 'sequence',
    status = 'status',
    system_name = 'system_name',
    console = 'console',
    updated_at = 'updated_at',
    version = 'version',
    connection_code = 'connection_code',
    execution_code = 'execution_code'
}

export enum DispatcherRun {
    TABLE = 'dispatcher_runs',
    dispatcher_run_id = 'dispatcher_run_id',
    remediations_run_id = 'remediations_run_id',
    status = 'status',
    created_at = 'created_at',
    updated_at = 'updated_at'
}
