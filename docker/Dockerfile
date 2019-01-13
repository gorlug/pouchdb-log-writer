FROM node:11.6.0-slim
ADD pouchdb-log-writer /home/node/pouchdb-log-writer
RUN chown -R node:node /home/node/pouchdb-log-writer
USER node
WORKDIR /home/node/pouchdb-log-writer
CMD ["npm", "start", "/home/node/pouchdb-log-writer/etc/config.json"]
