FROM pdsc/api-base

RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-lxml python3-requests

COPY tools/ /srv/tools/

WORKDIR /srv/tools
