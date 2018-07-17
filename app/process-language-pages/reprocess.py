#!/usr/bin/env python3

import argparse
import logging
import os
import sys
import re
import tarfile
import time
import shutil
import json
import requests

log = logging.getLogger('')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Reprocess an archived data folder')

    parser.add_argument('--data', dest='data',
                        help='The path to the data folders', required=True)

    parser.add_argument('--date', dest='date', required=True,
                        help='Resubmit a previous date to the service.')

    parser.add_argument('--service', dest='service', required=True,
                        help='The URI to the service.')

    parser.add_argument('--info', dest='info', action='store_true',
                        help='Turn on informational messages')
    parser.add_argument('--debug', dest='debug', action='store_true',
                        help='Turn on full debugging (includes --info)')

    args = parser.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG)

    if args.info:
        logging.basicConfig(level=logging.INFO)

    if not (args.debug and args.info):
        logging.basicConfig(level=logging.WARNING)

    zipped_path = "{0}/{1}.tbz".format(args.data, args.date)
    if os.path.exists(zipped_path):
        log.info("Extracting {0}".format(zipped_path))
        tar = tarfile.open(zipped_path, 'r:bz2')
        tar.extractall(args.data)
        tar.close()

    path = "{0}/{1}".format(args.data, args.date)
    service = "{0}/languages".format(args.service)
    i = 0
    for file in os.listdir(path):
        with open("{0}/{1}".format(path, file)) as f:
            i += 1
            log.info("Processing: {0}".format(file))
            try:
                data = json.loads(f.read(), encoding="utf-8")
            except:
                continue
            if 'date' not in data:
                data['date'] = args.date
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            response = requests.post(service, data=json.dumps(data), headers=headers);
            if i == 500:
                log.info("Processed 500. Sleeping for 5")
                time.sleep(5)
                i = 0
            if response.status_code != 200:
                log.error("Problem submitting: {0}".format(file))
