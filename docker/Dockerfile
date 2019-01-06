FROM node:11.6.0-slim
ADD log-file-writer /home/node/log-file-writer
RUN chown -R node:node /home/node/log-file-writer
USER node
WORKDIR /home/node/log-file-writer
CMD ["npm", "start", "/home/node/log-file-writer/etc/config.json"]
