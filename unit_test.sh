#!/bin/bash

# run our tests...
docker-compose -f build/docker-compose-unit_test.yml up --build --exit-code-from remediations-consumer

# save result...
result=$?

# tidy up...
docker-compose -f build/docker-compose-unit_test.yml down
