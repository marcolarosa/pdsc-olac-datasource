FROM pdsc/api-base

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-lxml python3-requests

COPY api/ /srv/pdsc-olac-datasource/api-service/
RUN cd /srv/pdsc-olac-datasource/api-service && npm install

WORKDIR /srv/pdsc-olac-datasource/api-service
