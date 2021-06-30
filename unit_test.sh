# Deploy ephemeral db
source $CICD_ROOT/deploy_ephemeral_db.sh

# Map env vars set by `deploy_ephemeral_db.sh` if vars the app uses are different
export DB_PASSWORD=$DATABASE_PASSWORD
export DB_USERNAME=$DATABASE_USERNAME
export DB_DATABASE=$DATABASE_NAME
export DB_HOST=$DATABASE_HOST

# run unit-tests
npm ci
npm run db:ims
npm run verify
result=$?

# TODO: add unittest-xml-reporting to rbac so that junit results can be parsed by jenkins
mkdir -p $WORKSPACE/artifacts
cat << EOF > $WORKSPACE/artifacts/junit-dummy.xml
<testsuite tests="1">
    <testcase classname="dummy" name="dummytest"/>
</testsuite>
EOF

exit $result