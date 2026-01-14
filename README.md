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

## Releases

Upon any change in the master branch the branch is tested, an image is built and deployed in CI and QA environments automatically.
This process is controlled by the [deployment Jenkinsfile](./deployment/Jenkinsfile).

The image can then be promoted to production using a [Jenkins job](https://jenkins-insights-jenkins.1b13.insights.openshiftapps.com/job/remediations/job/remediations-consumer-release/). Use the git commit SHA as the REVISION when running the job.

## Contact
For questions or comments join **#platform-automation-standup** at ansible.slack.com.
