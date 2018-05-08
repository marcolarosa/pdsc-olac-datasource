#!/usr/bin/env python

import os
import sys
import csv
import collections
import logging
import json
import datetime
from lxml import html, etree
import pprint
pp = pprint.PrettyPrinter(indent=4)
import requests

# get the logger
log = logging.getLogger('')

OLAC_LANGUAGE = collections.namedtuple('OLAC_LANGUAGE',
        ['n', 'code', 'name', 'coords', 'url', 'resources', 'level', 'status',
         'glotto_id', 'glotto_family_id', 'glotto_parent_id' ])

class dotdict(dict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

class LanguageFactory:
    def __init__(self, args):
        self.languages = args.languages
        self.languoids = args.languoids
        self.service = "{0}/language".format(args.service)
        self.pages = "http://www.language-archives.org/language"
        self.output = "{0}/{1}".format(args.output, datetime.date.today().strftime('%Y%m%d'))
        if not os.path.exists(self.output):
            os.makedirs(self.output, exist_ok=True)

        if args.mode == 'development':
            self.limit = 1
            self.region_pages = [
                'http://www.language-archives.org/area/pacific'
            ]
        elif args.mode == 'testing':
            self.limit = 10
            self.region_pages = [
                'http://www.language-archives.org/area/africa',
                'http://www.language-archives.org/area/americas'
            ]
        else:
            self.limit = None
            self.region_pages = [
                'http://www.language-archives.org/area/africa',
                'http://www.language-archives.org/area/americas',
                'http://www.language-archives.org/area/asia',
                'http://www.language-archives.org/area/europe',
                'http://www.language-archives.org/area/pacific'
            ]
        self.data = {
            'languages': {},
            'glottoLanguoids': {},
            'glottoLanguoidsByISOCode': {},
            'regions': {},
            'countries': {},
            'countriesByName': {},
            'countriesByCode': {},
            'countryList': {},
            'languageByCode': {}
        }
        self.data = dotdict(self.data)

    def process(self):
        self.processGlottologLanguoidsFile()
        self.processLanguagesFile()
        self.unifyLanguagesAndGlotto()
        self.createRegionLists()
        self.createCountryLists()
        self.createLanguageMap()
        self.processLanguageData()
        # self.writeIndex()

    def createRegionLists(self):
        regions = {}
        for region in self.region_pages:
            log.info("Processing region: %s" % region)
            base_url = region.split('area')[0].rstrip('/')

            region_data = []

            tree = html.parse(region)
            for e in tree.findall('//table[2]/tr/td/ul/li'):
                region_data.append({
                    'name': e.text_content().split('(')[0].strip(),
                    'count': e.text_content().split('(')[1].split(')')[0],
                    'url': "%s%s" % (base_url, e.xpath('a/@href')[0])
                })

            regions[region.split('/')[-1:][0]] = region_data
        self.data.regions = regions

    def createCountryLists(self):
        countries = {}
        for region in self.data.regions:
            count = 0
            if self.limit is not None and count >= self.limit:
                break
            for country in self.data.regions[region]:
                total_countries = len(self.data.regions[region])
                if self.limit is not None and count >= self.limit:
                    break
                count += 1
                log.info("Processing country: %s (%s of %s in %s)" % (country['name'], count, total_countries, region))
                base_url = country['url'].split('/country/')[0]
                country_code = country['url'].split('/country/')[1]
                tree = html.parse(country['url'])

                language_data = []

                for e in tree.findall('//table[2]/tr/td/ul/li'):
                    language_data.append({
                        'name': e.text_content().split('(')[0].strip(),
                        'url': "%s%s" % (base_url, e.xpath('a/@href')[0]),
                        'code': e.xpath('a/@href')[0].split('/')[2]
                    })

                country['country_code'] = country_code
                country['languages'] = language_data
                country['region'] = region
                countries[country['name']] = country
        self.data.countries = countries
        self.data.countryList = self.data.countries.keys()

    def createLanguageMap(self):
        for country in self.data.countryList:
            country = dotdict(self.data.countries[country])
            self.data.countriesByName[country.name] = country
            self.data.countriesByCode[country.country_code] = country
            for language in country.languages:
                language = dotdict(language)
                code = language.code
                self.data.languageByCode[code] = language

    def processLanguagesFile(self):
        with open(self.languages, encoding="utf8") as csvfile:
            d = csv.reader(csvfile)
            for row in d:
                try:
                    if len(row) == 10:
                        language = OLAC_LANGUAGE(
                            row[1], row[0], row[2], [row[8], row[9]], '', {}, '', '', '', '', '')
                    elif len(row) == 8:
                        language = OLAC_LANGUAGE(
                            row[1], row[0], row[2], [row[4], row[6]], '', {}, '', '', '', '', '')
                    else:
                        raise IndexError
                    self.data.languages[language.code] = language
                except IndexError:
                    continue

    def processGlottologLanguoidsFile(self):
        with open(self.languoids, encoding="utf8") as csvfile:
            d = csv.reader(csvfile)
            for row in d:
                self.data.glottoLanguoids[row[0]] = row
                try:
                    self.data.glottoLanguoidsByISOCode[row[9]] = row
                except:
                    pass

    def unifyLanguagesAndGlotto(self):
        for key in self.data.languages.keys():
            try:
                languoid = self.data.glottoLanguoidsByISOCode[key]
                self.data.languages[key] = self.data.languages[key]._replace(level=languoid[5])
                self.data.languages[key] = self.data.languages[key]._replace(status=languoid[6])
                self.data.languages[key] = self.data.languages[key]._replace(glotto_id=languoid[0])
                self.data.languages[key] = self.data.languages[key]._replace(glotto_family_id=languoid[1])
                self.data.languages[key] = self.data.languages[key]._replace(glotto_parent_id=languoid[2])
            except:
                pass

    def processLanguageData(self):
        total_languages = len(self.data.languageByCode.keys())
        i = 0
        for language_code in self.data.languageByCode.keys():
            i += 1
            try:
                language = self.data.languageByCode[language_code]
                self.data.languages[language.code] = self.data.languages[language.code]._replace(url=language.url)
                log.info("Processing language: {0} ({1} of {2})".format(language.name, i, total_languages))

                data_file = os.path.join(self.output, "{0}.json".format(language.code))
                if (os.path.exists(data_file)):
                    log.info("Language already processed today: {0}".format(language.name))
                    continue
                resources = self.getLanguageData(language)
                self.data.languages[language.code] = self.data.languages[language.code]._replace(resources=resources)
                response = self.saveLanguageData(self.data.languages[language.code])
                if response.status_code == 200:
                    log.info("Processing language: {0} saved".format(language.name))
                else:
                    log.error("Processing language: {0}: not saved".format(language.name))
                if self.limit is not None and i >= self.limit:
                    break;
            except KeyError:
                log.error("Language '%s' referenced in OLAC data but missing from languages.csv" % language.code)
                try:
                    languoid = self.data.glottoLanguoidsByISOCode[language.code]
                    log.error(languoid)
                except:
                    log.error("Language '%s' also missing from glottolog languoid csv file" % language.code)

    def getLanguageData(self, language):
        # html.parse is getting the HTTP resource
        language_resources = dotdict({
            'code': language.code,
            'name': language.name,
            'url': os.path.join(self.pages, language.code)
        })

        try:
            page = html.parse(language_resources.url)
        except IOError:
            # for whatever reason - page not accessible
            log.error("Couldn't get: %s" % page)
            return

        resources = {}
        for e in page.findall('//ol'):
            resource = e.getprevious().text_content()
            resource_list = e.findall('li')

            log.debug("Processing: %s, found: %s" % (resource, len(resource_list)))
            r = []
            for l in resource_list:
                rdata = {}
                for e in l.getchildren():
                    stringified = etree.tostring(e)
                    if e.tag == 'span' and e.attrib['class'] == 'online_indicator':
                        rdata['is_online'] = True
                    elif e.tag == 'a':
                        rdata['url'] = os.path.join(language_resources.url.split('/language')[0], e.attrib['href'].lstrip('/'))
                        rdata['name'] = e.text
                    else:
                        rdata['text'] = stringified.decode('utf-8')
                r.append(rdata)

            resources[resource] = {
                'count': len(resource_list),
                'resources': r
            }
        return resources

    def saveLanguageData(self, language):
        data = {
            'date': datetime.date.today().strftime('%Y%m%d'),
            'code': language.code,
            'name': language.name,
            'coords': language.coords,
            'level': language.level,
            'status': language.status,
            'glotto_id': language.glotto_id,
            'glotto_family_id': language.glotto_family_id,
            'glotto_parent_id': language.glotto_parent_id,
            'url': language.url,
            'resources': language.resources
        }
        with open(os.path.join(self.output, "%s.json" % language.code), 'w') as f:
            f.write(json.dumps(data))
        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        return requests.post(self.service, data=json.dumps(data), headers=headers);

    def writeIndex(self):
        data = {
            'regions': self.data.regions,
            'countries': self.data.countries,
            'languages': self.data.languageByCode.keys().sort()
        }
        with open(os.path.join(self.output, "index.json"), 'w') as f:
            f.write(json.dumps(data))
