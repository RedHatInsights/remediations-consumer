FROM registry.redhat.io/ubi8/nodejs-14

USER root

WORKDIR /opt/app-root/src

COPY package.json package-lock.json /opt/app-root/src/

RUN npm ci --only=production

COPY . /opt/app-root/src

RUN npm i typescript@3.6.3 && npm run compile

RUN UPDATE_PKGS="kernel-headers binutils" && \
    yum update -y $UPDATE_PKGS && \
    yum clean all

USER 1001

EXPOSE 9006
ENV NODE_ENV=production
CMD [ "node", "dist/src/app.js" ]
