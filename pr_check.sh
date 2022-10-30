#!/bin/bash

# --------------------------------------------
# Options that must be configured by app owner
# --------------------------------------------
APP_NAME="remediations"  # name of app-sre "application" folder this component lives in
COMPONENT_NAME="remediations-consumer"  # name of app-sre "resourceTemplate" in deploy.yaml for this component
IMAGE="quay.io/cloudservices/remediations-consumer"
DOCKERFILE=build/Dockerfile
DB_DEPLOYMENT_NAME=remediations-db

# ADD IQE TESTS IN LATER
# IQE_PLUGINS="remediations"
# IQE_MARKER_EXPRESSION="smoke"
# IQE_FILTER_EXPRESSION=""

# Install bonfire repo/initialize
CICD_URL=https://raw.githubusercontent.com/RedHatInsights/bonfire/master/cicd
curl -s $CICD_URL/bootstrap.sh > .cicd_bootstrap.sh && source .cicd_bootstrap.sh

# Build Remediations image based on the latest commit
source $CICD_ROOT/build.sh
source $APP_ROOT/unit_test.sh
