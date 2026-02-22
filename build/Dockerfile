#----------------------- base -----------------------

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.7-1771346502 AS base

RUN microdnf module enable -y nodejs:22 && \
    microdnf install -y nodejs npm --nodocs && \
    microdnf upgrade -y && \
    microdnf clean all

ENV APP_ROOT=/opt/app-root/src
WORKDIR $APP_ROOT
RUN mkdir -p $APP_ROOT/.npm/{_logs,_cacache} && chgrp -R 0 $APP_ROOT && chmod -R ug+rwX $APP_ROOT

RUN npm install -g npm@11.4.2

USER 1001

# make npm happy....
ENV HOME=$APP_ROOT

#-------------------- packages ----------------------

FROM base AS packages

COPY ./test ./test
COPY package.json package-lock.json .cleanmodules knexfile.js ./

#----------------------- test -----------------------

FROM packages AS test

USER 0
RUN microdnf install -y python3 gcc-c++ make --nodocs && microdnf clean all
USER 1001

COPY jest.config.js tsconfig.json ./
COPY ./src ./src

RUN npm ci
RUN npx clean-modules -y

RUN npm run compile

ENV NODE_ENV=test

#----------------------- dist -----------------------

FROM packages AS dist

COPY --from=test $APP_ROOT/dist ./dist
COPY --from=test $APP_ROOT/node_modules ./node_modules

# Remove dev dependencies without needing to rebuild
USER 0
RUN npm prune --production && npm cache clean --force
USER 1001

EXPOSE 9006

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

CMD [ "node", "dist/src/app.js" ]
