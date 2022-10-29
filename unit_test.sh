# Docker version 20.10.14, build a224086
# docker-compose version 1.29.1, build c34c88b2
# podman version 1.6.4

# run tests...
docker-compose -f build/docker-compose-unit_test.yml up --exit-code-from remediations-consumer
result=$?
docker-compose -f build/docker-compose-unit_test.yml down

# TODO: add unittest-xml-reporting to rbac so that junit results can be parsed by jenkins
mkdir -p $WORKSPACE/artifacts
cat << EOF > $WORKSPACE/artifacts/junit-dummy.xml
<testsuite tests="1">
    <testcase classname="dummy" name="dummytest"/>
</testsuite>
EOF
