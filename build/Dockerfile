#----------------------- base -----------------------

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.4-1227.1725849298 AS base

RUN microdnf module enable -y nodejs:20 && \
    microdnf install -y nodejs --nodocs && \
    microdnf clean all

ENV APP_ROOT=/opt/app-root/src
WORKDIR $APP_ROOT
RUN mkdir -p $APP_ROOT/.npm/{_logs,_cacache} && chgrp -R 0 $APP_ROOT && chmod -R ug+rwX $APP_ROOT

RUN npm install -g npm@10.8.1

USER 1001

# make npm happy....
ENV HOME=$APP_ROOT

#-------------------- packages ----------------------

FROM base AS packages

COPY ./test ./test
COPY package.json package-lock.json knexfile.js ./

#----------------------- test -----------------------

FROM packages AS test

COPY jest.config.js tsconfig.json ./
COPY ./src ./src

RUN npm ci

RUN npm run compile

ENV NODE_ENV=test

#----------------------- dist -----------------------

FROM packages AS dist

COPY --from=test $APP_ROOT/dist ./dist

RUN npm ci --omit=dev && npm cache clean --force

EXPOSE 9006

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

CMD [ "node", "dist/src/app.js" ]
