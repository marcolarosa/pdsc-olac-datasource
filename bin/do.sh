#!/bin/bash

usage() {
cat <<EOF
    Pass in one of "enter | log | inspect"
EOF
exit -1
}

enterLogInspect() {
    action="$1"
    select container in $(docker ps --format '{{.Names}}' | sed  ':a;N;$!ba;s/\n/ /g'); do
        case $action in
            enter)
                docker exec -it "${container}" bash
                ;;
            log)
                docker logs -f "${container}"
                ;;
            inspect)
                docker inspect "${container}"
                ;;
        esac
    done
}
if [ "$#" != 1 ] ; then
    usage
fi
enterLogInspect ${1}
