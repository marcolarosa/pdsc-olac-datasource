#!/usr/bin/env bash

BASE="../config"

usage() {
cat <<EOF
    Couldn't find "${BASE}${1} or "${BASE}/default". Exiting
EOF
exit -1
}

breathe() {
    time="${1}"
    msg="${2}"
	secs=$((time))
	while [ $secs -gt 0 ]; do
		echo -ne "${msg}: $secs\033[0K\r"
		sleep 1
		: $((secs--))
	done
}

start() {
    docker-compose -f ${BASE}/${1}/compose.yml up -d
}

if [ "$#" == 2 ] ; then
    USER="${1}"
    ENVIRONMENT="${2}" 
    if [ -d "${BASE}/${USER}/${ENVIRONMENT}" ] ; then
        start "${USER}/${ENVIRONMENT}"
    fi
else
    if [ -d "${BASE}/default/default" ] ; then
        start "default/default"
    else
        usage
    fi
fi
