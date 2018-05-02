#!/usr/bin/env bash

BASE="../config"

usage() {
cat <<EOF
    Couldn't find "${BASE}${1}" or "${BASE}/default". Exiting
EOF
exit -1
}

scripts="compose.yml"

stop() {
    for script in $scripts ; do
        docker-compose -f "${BASE}/${1}/${script}" stop
        docker-compose -f "${BASE}/${1}/${script}" rm -f
    done
}

if [ "$#" == 2 ] ; then
    USER="${1}"
    ENVIRONMENT="${2}"
    if [ -d "${BASE}/${USER}/${ENVIRONMENT}" ] ; then
        stop "${USER}/${ENVIRONMENT}"
    fi
else
    if [ -d "${BASE}/default/default" ] ; then
        stop "default/default"
    else
        usage
    fi
fi
