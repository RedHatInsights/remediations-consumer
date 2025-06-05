#!/bin/bash

# The following are defined outside of this script:
# DOCKERFILE
# APP_ROOT
# IMAGE_TAG

cd $APP_ROOT

API_IMAGE="local/remediations-consumer-test-${IMAGE_TAG}"
API_CONTAINER_NAME="remediations-consumer-test-${IMAGE_TAG}"

DB_IMAGE="quay.io/cloudservices/postgresql-rds:16"
DB_CONTAINER_NAME="remediations-consumer-db-${IMAGE_TAG}"

NETWORK="remediations-consumer-test-${IMAGE_TAG}"

# cleanup function to tidy up after the test run
function tidy_up {
  echo '----> Tidying up...'

	podman rm -f $DB_CONTAINER_ID || true
	podman rm -f $API_CONTAINER_ID || true
	podman network rm -f $NETWORK || true

  podman rmi -f $API_IMAGE || true
  podman rmi -f $DB_IMAGE || true

  podman container prune --force || true
}

trap "tidy_up" EXIT SIGINT SIGTERM

#---------------------
# create test network
#---------------------
echo '----> Create network...'

podman network create --driver bridge $NETWORK

if [ $? -ne 0 ]; then
	echo '====> FAILED creating test network'
	exit 1
fi

#--------------------
# start db container
#--------------------
echo '----> pull DB image...'
podman pull $DB_IMAGE

echo '----> start db container...'
DB_CONTAINER_ID=$(podman run -d \
	--name "${DB_CONTAINER_NAME}" \
	--network "${NETWORK}" \
	-e POSTGRESQL_USER="postgres_user" \
	-e POSTGRESQL_PASSWORD="remediations" \
	-e POSTGRESQL_DATABASE="remediations" \
	${DB_IMAGE} || echo "0")

if [[ "$DB_CONTAINER_ID" == "0" ]]; then
	echo "====> FAILED to start DB container"
	exit 1
fi

#-----------------------------------
# start remediations-test container
#-----------------------------------
echo '----> build api test image...'
podman build -f $DOCKERFILE --target test -t $API_IMAGE .

echo '----> start api test container...'
API_CONTAINER_ID=$(podman run -d \
  --name "${API_CONTAINER_NAME}" \
  --network "${NETWORK}" \
  -e NODE_ENV="test" \
  -e DB_HOST="${DB_CONTAINER_NAME}" \
  $API_IMAGE \
  /bin/bash -c 'sleep infinity' || echo "0")

if [[ "$API_CONTAINER_ID" == "0" ]]; then
	echo "Failed to start api container"
	exit 1
fi

#-------------------------------------
# run remediations-tests in container
#-------------------------------------
echo '----> run api tests...'
podman exec $API_CONTAINER_ID /bin/bash -c 'npx wait-on -t 10s tcp:$DB_HOST:5432 && npm run test:ci'
TEST_RESULT=$?

if [ $TEST_RESULT -ne 0 ]; then
	echo '====> unit tests FAILED'
	exit 1
fi

#----------------
# report results
#----------------
echo '----> record results...'
mkdir -p $WORKSPACE/artifacts
podman cp $API_CONTAINER_ID:/opt/app-root/src/artifacts/. $WORKSPACE/artifacts

echo '====> unit tests PASSED'

tidy_up
