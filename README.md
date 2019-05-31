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

## Contact
For questions or comments join **#insights-remediations** at ansible.slack.com or contact [Jozef Hartinger](https://github.com/jharting) directly.
