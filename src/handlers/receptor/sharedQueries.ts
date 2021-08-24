import { trim } from '../../util/strings';
import * as Knex from 'knex';
import { PlaybookRunExecutor, PlaybookRunSystem, PlaybookRun, Status } from '../models';

const NON_FINAL_STATES_SYSTEMS = [Status.PENDING, Status.RUNNING];
const NON_FINAL_STATES_EXECUTORS = [Status.PENDING, Status.ACKED, Status.RUNNING];
const FINAL_STATES = [Status.SUCCESS, Status.FAILURE, Status.CANCELED];

const EXECUTOR_FINAL_STATUS_SUBQUERY = trim`
    (
        SELECT "status" FROM (
            SELECT
                "status"::VARCHAR,
                (
                    CASE
                        WHEN "status" = 'failure' THEN 2
                        WHEN "status" = 'canceled' THEN 1
                        ELSE 0
                    END
                ) as "result"
            FROM "playbook_run_systems"
            WHERE "playbook_run_systems"."playbook_run_executor_id" = "playbook_run_executors"."id"
            ORDER BY "result" DESC
            LIMIT 1
        ) as "status"
    )::enum_playbook_run_executors_status`;

const RUN_FINAL_STATUS_SUBQUERY = trim`
    (
        SELECT "status" FROM (
            SELECT
                "executors"."status"::VARCHAR,
                (
                    CASE
                        WHEN "executors"."status" = 'failure' THEN 2
                        WHEN "executors"."status" = 'canceled' THEN 1
                        ELSE 0
                    END
                ) as "result"
            FROM "playbook_run_executors" AS "executors"
            WHERE "playbook_runs"."id" = "executors"."playbook_run_id"
            ORDER BY "result" DESC
            LIMIT 1
        ) as "status"
    )::enum_playbook_runs_status`;

export function whereUnfinishedExecutorsWithFinishedSystems (knex: Knex) {
    return knex(PlaybookRunExecutor.TABLE)
    .whereNotIn(PlaybookRunExecutor.status, FINAL_STATES)
    .whereNotExists(
        knex(PlaybookRunSystem.TABLE)
        .whereIn(PlaybookRunSystem.status, NON_FINAL_STATES_SYSTEMS)
        .where(PlaybookRunSystem.playbook_run_executor_id, knex.raw('"playbook_run_executors"."id"'))
    );
}

export function whereUnfinishedRunsWithFinishedExecutors (knex: Knex) {
    return knex(PlaybookRun.TABLE)
    .whereNotIn(PlaybookRun.status, FINAL_STATES)
    .whereExists(
        knex(PlaybookRunExecutor.TABLE)
        .where(PlaybookRunExecutor.playbook_run_id, knex.raw('"playbook_runs"."id"'))
    )
    .whereNotExists(
        knex(PlaybookRunExecutor.TABLE)
        .whereIn(PlaybookRunExecutor.status, NON_FINAL_STATES_EXECUTORS)
        .where(PlaybookRunExecutor.playbook_run_id, knex.raw('"playbook_runs"."id"'))
    );
}

export function updateStatusExecutors (knex: Knex, builder: Knex.QueryBuilder<any, any>) {
    return builder.update({
        [PlaybookRunExecutor.status]: knex.raw(EXECUTOR_FINAL_STATUS_SUBQUERY)
    }, ['id', 'status']);
    // Need to find a way to also update connection_code and execution_code here using this syntax
    // OR just by using the regular knex syntax
}

export function updateStatusRuns (knex: Knex, builder: Knex.QueryBuilder<any, any>) {
    return builder.update(PlaybookRun.status, knex.raw(RUN_FINAL_STATUS_SUBQUERY), ['id', 'status']);
}
