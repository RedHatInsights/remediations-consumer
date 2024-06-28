#!/bin/bash

# run our tests...
podman-compose -f build/docker-compose-unit_test.yml up --build --exit-code-from remediations-consumer

# save result...
result=$?

# tidy up...
podman-compose -f build/docker-compose-unit_test.yml down
