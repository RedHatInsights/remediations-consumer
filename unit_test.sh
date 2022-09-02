# Deploy ephemeral db
source $CICD_ROOT/deploy_ephemeral_db.sh

# Map env vars set by `deploy_ephemeral_db.sh` if vars the app uses are different
export DB_PASSWORD=$DATABASE_ADMIN_PASSWORD
export DB_USERNAME=$DATABASE_ADMIN_USERNAME
export DB_DATABASE=$DATABASE_NAME
export DB_HOST=$DATABASE_HOST
export DB_PORT=$DATABASE_PORT

echo DB_PASSWORD: $DB_PASSWORD
echo DB_USERNAME: $DB_USERNAME
echo DB_DATABASE: $DB_DATABASE
echo DB_HOST:     $DB_HOST
echo DB_PORT:     $DB_PORT

# run unit-tests
npm ci
npm run test-jenkins
result=$?

# TODO: add unittest-xml-reporting to rbac so that junit results can be parsed by jenkins
mkdir -p $WORKSPACE/artifacts
cat << EOF > $WORKSPACE/artifacts/junit-dummy.xml
<testsuite tests="1">
    <testcase classname="dummy" name="dummytest"/>
</testsuite>
EOF
