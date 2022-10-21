FROM registry.redhat.io/ubi8/ubi-minimal:latest

USER root

WORKDIR /opt/app-root/src

RUN microdnf module enable nodejs:12 && \
    microdnf install -y nodejs --nodocs && \
    microdnf install -y yum --nodocs && \
    yum install -y kernel-headers binutils && \
    microdnf clean all

COPY package.json package-lock.json /opt/app-root/src/

RUN npm ci --only=production

COPY . /opt/app-root/src

RUN npm i typescript@4.8.4 && npm run compile

RUN UPDATE_PKGS="kernel-headers binutils" && \
    yum update -y $UPDATE_PKGS && \
    yum clean all

USER 1001

EXPOSE 9006
ENV NODE_ENV=production
CMD [ "node", "dist/src/app.js" ]
