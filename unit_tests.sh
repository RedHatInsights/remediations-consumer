#!/bin/bash

cd $APP_ROOT

# Deploy ephemeral DB
source $CICD_ROOT/deploy_ephemeral_db.sh

# Map env vars set by `deploy_ephemeral_db.sh` if vars the app users are different
export POSTGRES_ADMIN_PASSWORD=$DATABASE_ADMIN_PASSWORD
export DB_HOST=$DATABASE_HOST
export DB_DATABASE=$DATABASE_NAME
export DB_USERNAME=$DATABASE_USER
export DB_PASSWORD=$DATABASE_PASSWORD
export DB_PORT=$DATABASE_PORT

# install requirements
npm install

# run unit tests
npm run verify
