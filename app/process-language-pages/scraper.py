#!/usr/bin/env python

import argparse
import logging
from src.LanguageFactory import LanguageFactory

log = logging.getLogger('')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create Summary Page')

    parser.add_argument('--languages', dest='languages',
                        help='The path to the CSV file containing the language codes', default="languages.csv")
    parser.add_argument('--glotto-languoids', dest='languoids',
                        help='The path to glottolog languoids CSV file', default="languoid.csv")
    parser.add_argument('--mode', dest='mode', choices=['development', 'testing'],
                        help='The mode in which to run - limits the processing.')
    parser.add_argument('--service', dest='service', help='The url to submit the data to.', default="http://localhost:3000")
    parser.add_argument('--output-folder', dest='output', help='The folder to write the data to.', required=True)

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

    factory = LanguageFactory(args)
    factory.process()
