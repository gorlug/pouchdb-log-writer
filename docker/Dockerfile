FROM node:11.6.0-slim
USER node
RUN cd /home/node && npm install @gorlug/pouchdb-log-writer
WORKDIR /home/node
CMD ["node", "node_modules/@gorlug/pouchdb-log-writer/build/main/index.js", "/home/node/pouchdb-log-writer/etc/config.json"]
