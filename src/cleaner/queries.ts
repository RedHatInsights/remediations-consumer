import {  Knex } from 'knex';
import { PlaybookRunSystem, Status } from '../handlers/models';
import {
    whereUnfinishedExecutorsWithFinishedSystems,
    updateStatusExecutors,
    whereUnfinishedRunsWithFinishedExecutors,
    updateStatusRuns
} from '../handlers/receptor/sharedQueries';

const FINAL_STATES = [Status.SUCCESS, Status.FAILURE, Status.CANCELED];
// Testing PR check
export function cancelSystems (knex: Knex, timeoutMinutes = 3 * 60) {
    return knex(PlaybookRunSystem.TABLE)
    .whereNotIn(PlaybookRunSystem.status, FINAL_STATES)
    .whereRaw(`updated_at < now() - ? * interval '1 minute'`, [timeoutMinutes])
    .update({
        [PlaybookRunSystem.status]: Status.CANCELED
    }, ['id', 'status']);
}

export function cancelExecutors (knex: Knex, timeoutMinutes = 15) {
    const query = whereUnfinishedExecutorsWithFinishedSystems(knex)
    .whereRaw(`updated_at < now() - ? * interval '1 minute'`, [timeoutMinutes]);

    return updateStatusExecutors(knex, query);
}

export function cancelRuns (knex: Knex, timeoutMinutes = 15) {
    const query = whereUnfinishedRunsWithFinishedExecutors(knex)
    .whereRaw(`updated_at < now() - ? * interval '1 minute'`, [timeoutMinutes]);

    return updateStatusRuns(knex, query);
}
