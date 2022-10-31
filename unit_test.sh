DOCKER_UID=$(id -u)
DOCKER_GID=$(id -g)

# run our tests...
docker-compose -f build/docker-compose-unit_test.yml up --build --exit-code-from remediations-consumer

# save result...
result=$?

# tidy up...
docker-compose -f build/docker-compose-unit_test.yml down

# TODO: add unittest-xml-reporting to rbac so that junit results can be parsed by jenkins
mkdir -p $WORKSPACE/artifacts
cat << EOF > $WORKSPACE/artifacts/junit-dummy.xml
<testsuite tests="1">
    <testcase classname="dummy" name="dummytest"/>
</testsuite>
EOF
