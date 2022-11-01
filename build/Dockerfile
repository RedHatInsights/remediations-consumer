#--- base ---
# -> node

#--- base -> packages ---
# node
# -> npm-prod

#--- packages -> test ---
# node
# npm-prod
# -> npm-dev
# -> src
# -> ./dist

#--- packages -> dist ---
# node
# npm-prod
# test:./dist

#----------------------- base -----------------------

FROM registry.redhat.io/ubi8/ubi-minimal:latest AS base

WORKDIR /opt/app-root/src

RUN microdnf module enable nodejs:16 && \
    microdnf install -y nodejs --nodocs && \
    microdnf install -y yum --nodocs && \
    yum install -y kernel-headers binutils findutils && \
    microdnf clean all && yum clean all

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

RUN npm ci --only=production

COPY --from=test /opt/app-root/src/dist/src /opt/app-root/src/dist/package.json ./dist

USER 1001
EXPOSE 9006
ENV NODE_ENV=production

CMD [ "node", "dist/src/app.js" ]
