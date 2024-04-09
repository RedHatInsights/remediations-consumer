#----------------------- base -----------------------

FROM registry.access.redhat.com/ubi8/ubi-minimal:8.9-1161 AS base

WORKDIR /opt/app-root/src

RUN microdnf module enable nodejs:20 && \
    microdnf install -y nodejs --nodocs && \
    microdnf clean all

RUN npm install -g npm@10.5.1

#--------------------- packages ---------------------

FROM base AS packages

COPY package.json package-lock.json ./

#----------------------- test -----------------------

FROM packages AS test

RUN npm ci

COPY . .

RUN npm run compile

ENV NODE_ENV=test

#----------------------- dist -----------------------

FROM packages AS dist

RUN npm ci --omit=dev

COPY --from=test /opt/app-root/src/dist/package.json ./dist/
COPY --from=test /opt/app-root/src/dist/src ./dist/src

USER 1001
EXPOSE 9006

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

CMD [ "node", "dist/src/app.js" ]
