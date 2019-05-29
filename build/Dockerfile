FROM registry.access.redhat.com/rhoar-nodejs/nodejs-10

WORKDIR /opt/app-root/src

COPY package.json package-lock.json /opt/app-root/src/

RUN npm ci --only=production

COPY . /opt/app-root/src

EXPOSE 9006
ENV NODE_ENV=production
CMD [ "node", "src/app.js" ]
