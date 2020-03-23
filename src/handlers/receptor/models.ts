export enum Status {
    PENDING = 'pending',
    ACKED = 'acked',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILURE = 'failure',
    CANCELED = 'canceled'
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
    updated_at = 'updated_at'
}

export enum PlaybookRunSystem {
    TABLE = 'playbook_run_systems',
    id = 'id',
    playbook_run_executor_id = 'playbook_run_executor_id',
    sequence = 'sequence',
    status = 'status',
    system_name = 'system_name',
    console = 'console',
    updated_at = 'updated_at'
}
