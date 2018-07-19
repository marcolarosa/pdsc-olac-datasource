FROM pdsc-olac-datasource/api-base

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-lxml python3-requests

RUN npm install -g pm2

COPY ecosystem.config.js /srv/pdsc-olac-datasource/api-service/
COPY api/ /srv/pdsc-olac-datasource/api-service/
RUN cd /srv/pdsc-olac-datasource/api-service && yarn install

RUN npm install -g pm2

WORKDIR /srv/pdsc-olac-datasource/api-service
