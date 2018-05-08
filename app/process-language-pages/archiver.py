#!/usr/bin/env python3

import argparse
import logging
import os
import re
import datetime
import tarfile
import shutil

log = logging.getLogger('')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Archive data folders')

    parser.add_argument('--data', dest='data',
                        help='The path to the data folders', required=True)

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

    today = re.compile("^{0}".format(datetime.date.today().strftime('%Y%m%d')));
    unzippedFolder = re.compile(r'^\d\d\d\d\d\d\d\d$')
    for folder in os.listdir(args.data):
        if today.match(folder):
            log.info("Skipping today: {0}".format(folder))
        elif unzippedFolder.match(folder):
            path = "{0}/{1}".format(args.data, folder)
            archive = "{0}.tbz".format(path)
            log.info("Archiving: {0}".format(path))
            with tarfile.open(archive, "w:bz2") as tar:
                tar.add(path, arcname=folder)
            shutil.rmtree(path)
