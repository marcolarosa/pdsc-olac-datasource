FROM pdsc/api-base

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-lxml python3-requests

RUN npm install -g pm2

COPY ecosystem.config.js /srv/api-service/
COPY api/ /srv/api-service/
RUN cd /srv/api-service && npm install

RUN npm install -g pm2

WORKDIR /srv/api-service
