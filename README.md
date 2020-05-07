[![Build Status](https://jenkins-jenkins.5a9f.insights-dev.openshiftapps.com/buildStatus/icon?job=insights-remediations/remediations-consumer-ci)](https://jenkins-jenkins.5a9f.insights-dev.openshiftapps.com/job/insights-remediations/job/remediations-consumer-ci/)

# Remediations Consumer

Kafka consumer that consumes messages produced by applications and updates state in Remediations database and Redis accordingly.

## Getting started

### Prerequisities

* node.js 10

### Running the application locally

1. ```docker-compose -f build/docker-compose.yml up```

### Local development

1. ```npm ci```
1. ```docker-compose -f build/docker-compose.yml up zookeeper```
1. ```docker-compose -f build/docker-compose.yml up kafka```
1. ```docker-compose -f build/docker-compose.yml up db```
1. ```npm run db:ims```
1. ```npm start```

Metrics can be found at http://localhost:9006/metrics

### Testing

To run the linter, unit and integration tests run:
```
npm run verify
```

#### Manual testing

Run `node test/producer.js` to produce a test message and send it to Kafka.

## Cleaner script

In addition to the consumer itself this repository also hosts [a script](./src/cleaner/run.ts) that cleans up `playbook_runs`, `playbook_run_executors` and `playbook_run_systems` that failed to reach a final state. More specifically, it:
* looks for `playbook_run_systems` that haven't received an updated in more than 6 hours and failed to reach one of the final statuses (success, failure, canceled). These records are set the `canceled` status.
* looks for `playbook_run_executors` that haven't received an update in more than 15 minutes and did not reach one of the final statuses despite all their `playbook_run_systems` being finished. The status of these records is set based on the status of its systems:
  * `failure` if any of the systems failed
  * `canceled` if any of the systems was canceled
  * `success` otherwise
* looks for `playbook_runs` that haven't received an update in more than 15 minutes and did not reach one of the final statuses despite their `playbook_run_executors` being finished. The status of these records is set based on the status of its executors:
  * `failure` if any of the executors failed
  * `canceled` if any of the executors was canceled
  * `success` otherwise

## Releases

Upon any change in the master branch the branch is tested, an image is built and deployed in CI and QA environments automatically.
This process is controlled by the [deployment Jenkinsfile](./deployment/Jenkinsfile).

The image can then be promoted to production using a [Jenkins job](https://jenkins-insights-jenkins.1b13.insights.openshiftapps.com/job/remediations/job/remediations-consumer-release/). Use the git commit SHA as the REVISION when running the job.

## Contact
For questions or comments join **#platform-automation-standup** at ansible.slack.com.
