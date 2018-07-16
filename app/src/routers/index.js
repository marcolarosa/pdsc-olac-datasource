'use strict';

const models = require('../models').getModels();
const moment = require('moment');
const errors = require('restify-errors');
const Sequelize = require('sequelize');
const fs = require('fs');
const util = require('util');
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const write = util.promisify(fs.writeFile);
const read = util.promisify(fs.readFile);

module.exports = {
    wireUpRoutes,
    loadHarvestDates
};

function wireUpRoutes(server) {
    server.get('/', getHelp);
    server.get('/dates', getDates);
    server.get('/regions', getRegions);
    server.get('/regions/:region', getRegion);
    server.get('/countries', getCountries);
    server.get('/countries/:country', getCountry);
    server.get('/languages', getLanguage);
    server.get('/languages/:code', getLanguage);
    server.get('/languages/:code/resources', getLanguageResources);
    server.post('/regions', demandLocal, postRegions);
    server.post('/countries', demandLocal, postCountries);
    server.post('/languages', demandLocal, postLanguage);
}

function getHelp(req, res, next) {
    res.send(200, {
        'API routes': {
            dates: {
                URI: '/dates',
                returns: 'An array of available harvest dates'
            },
            regions: [
                {
                    URI: '/regions',
                    returns: 'The list of regions.'
                },
                {
                    URI: '/regions/{region name}',
                    returns: 'The region and its associated countries.'
                }
            ],
            countries: [
                {
                    URI: '/countries',
                    returns: 'The list of countries.'
                },
                {
                    URI: '/countries/{country name}',
                    returns: 'The countries and its associated languages.'
                }
            ],
            languages: [
                {
                    URI: '/languages/{language code}',
                    returns:
                        'The most recent language data harvested without resources.'
                },
                {
                    URI: '/languages/{language code}?date=20180501',
                    returns:
                        'The language data harvested on 20180501 - again without resources.'
                },
                {
                    URI: '/languages/{language code}/resources',
                    returns: 'The most recent language resources harvested.'
                },
                {
                    URI: '/languages/{language code}/resources?date=20180501',
                    returns: 'The language resources harvested on 20180501.'
                }
            ]
        }
    });
    return next();
}

async function getDates(req, res, next) {
    res.send(200, await loadHarvestDates());
    return next();
}

async function getRegions(req, res, next) {
    const regions = await models.region.findAll();
    res.send(200, regions.map(r => r.get('name')));
    return next();
}

async function getRegion(req, res, next) {
    if (!req.params.region) {
        return next(new errors.BadRequestError());
    }
    const region = await models.region.findOne({
        where: {name: req.params.region},
        attributes: ['name'],
        include: [
            {
                model: models.country,
                attributes: ['name']
            }
        ]
    });
    if (region) {
        res.send(200, region.get());
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getCountries(req, res, next) {
    const countries = await models.country.findAll();
    res.send(200, countries.map(c => c.get('name')).sort());
    return next();
}

async function getCountry(req, res, next) {
    if (!req.params.country) {
        return next(new errors.BadRequestError());
    }
    let country = await models.country.findOne({
        where: {name: req.params.country},
        attributes: ['name'],
        include: [{model: models.language, attributes: ['code'], raw: true}]
    });
    if (country) {
        country = country.get();
        country.languages = country.languages.map(l => l.code).sort();
        res.send(200, country);
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function loadHarvestDates() {
    let dates = await models.harvest.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('date')), 'date']]
    });
    dates = dates.map(d => d.get('date'));
    return dates.sort();
}

async function getLanguage(req, res, next) {
    if (!req.params.code) {
        return next(new errors.BadRequestError());
    }
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    const language = await models.language.findOne({
        where: {
            code: req.params.code
        },
        include: [
            {
                model: models.harvest,
                where: {date},
                attributes: ['date', 'metadata']
            }
        ],
        attributes: ['id', 'code']
    });
    if (language) {
        res.send(200, language.get());
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getLanguageResources(req, res, next) {
    if (!req.params.code) {
        return next(new errors.BadRequestError());
    }
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    let language = await models.language.findOne({
        where: {
            code: req.params.code
        },
        include: [
            {
                model: models.harvest,
                where: {date},
                attributes: ['date', 'resources']
            }
        ],
        attributes: ['id', 'code']
    });
    const harvests = await Promise.all(
        language.get('harvests').map(async harvest => {
            const resources = await read(harvest.resources);
            return {
                date: harvest.date,
                resources: JSON.parse(resources)
            };
        })
    );
    language.harvests = harvests;
    res.send(200, harvests);
    return next();
}

async function postLanguage(req, res, next) {
    if (!req.body.code || !req.body.date) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {
            code: req.body.code,
            date: req.body.date,
            metadata: {...req.body}
        };

        delete data.metadata.resources;

        await prepareRepository({date: req.body.date});

        let language = await createLanguageEntry(data.code);
        let harvest = await createHarvestEntry(data, language);
        const repo = process.env.PDSC_HARVEST_REPOSITORY;
        const datafile = `${repo}/${req.body.date}/${req.body.code}.json`;
        await save({datafile, resources: req.body.resources});
        harvest.update({metadata: data.metadata, resources: datafile});
        language = await lookupNewEntry(data.code, data.date);
        res.send(200, language.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }

    async function save({datafile, resources}) {
        let result = await write(datafile, JSON.stringify(resources));
    }

    async function prepareRepository({date}) {
        const folder = `${process.env.PDSC_HARVEST_REPOSITORY}/${date}`;
        try {
            let result = await stat(folder);
            if (!result.isDirectory()) {
                console.error(`${folder} exists but is not a folder.`);
                throw new Error(errors.InternalServerError);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                await mkdir(folder);
            }
        }
    }

    async function createLanguageEntry(code) {
        const language = await models.language.findOrCreate({
            where: {code},
            defaults: {
                code
            }
        });
        return language[0];
    }

    async function createHarvestEntry(data, language) {
        try {
            let harvest = await models.harvest.findOne({
                where: {
                    date: data.date,
                    languageId: language.get('id')
                }
            });
            if (harvest) return harvest;
            harvest = await models.harvest.create({
                date: data.date,
                languageId: language.get('id'),
                metadata: data.metadata,
                resources: data.resources
            });
            return harvest;
        } catch (error) {
            console.log(error);
        }

        // const harvest = await models.harvest.findOrCreate({
        //     where: {
        //         date: data.date,
        //         languageId: language.get('id')
        //     },
        //     defaults: {
        //         date: data.date,
        //         languageId: language.get('id'),
        //         metadata: data.metadata,
        //         resources: data.resources
        //     }
        // });
        // return harvest[0];
    }

    async function lookupNewEntry(code, date) {
        return await models.language.findOne({
            where: {code},
            include: [
                {
                    model: models.harvest,
                    where: {date},
                    attributes: ['date', 'metadata']
                }
            ],
            attributes: ['id', 'code']
        });
    }
}

async function postRegions(req, res, next) {
    if (!req.body.name || !req.body.countries) {
        return next(new errors.BadRequestError());
    }
    try {
        let region = await createRegionEntry(req.body.name);
        await createCountryEntries(req.body.countries, region);
        region = await lookupNewEntry(region.get('name'));
        res.send(200, region.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }

    async function createRegionEntry(name) {
        const region = await models.region.findOrCreate({
            where: {name},
            defaults: {name}
        });
        return region[0];
    }

    async function createCountryEntries(countries, region) {
        let data;
        for (let country of req.body.countries) {
            data = {
                name: country,
                regionId: region.get('id')
            };
            await models.country.findOrCreate({
                where: data,
                defaults: data
            });
        }
    }

    async function lookupNewEntry(region) {
        return await models.region.findOne({
            where: {name: region},
            include: [{model: models.country}]
        });
    }
}

async function postCountries(req, res, next) {
    if (!req.body.name || !req.body.languages) {
        return next(new errors.BadRequestError());
    }
    try {
        let country = await createCountryEntry(req.body.name);
        await createLanguageEntries(req.body.languages, country);
        country = await lookupNewEntry(country.get('name'));
        res.send(200, country.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }

    async function createCountryEntry(name) {
        const country = await models.country.findOrCreate({
            where: {name},
            defaults: {name}
        });
        return country[0];
    }

    async function createLanguageEntries(languages, country) {
        let data, language;
        for (let code of languages) {
            language = await models.language.findOrCreate({
                where: {code},
                defaults: {code}
            });
            language = language[0];
            data = {
                languageId: language.get('id'),
                countryId: country.get('id')
            };
            await models.language_country.findOrCreate({
                where: data,
                defaults: data
            });
        }
    }

    async function lookupNewEntry(name) {
        return await models.country.findOne({
            where: {name},
            include: [{model: models.language}]
        });
    }
}

function demandLocal(req, res, next) {
    if (req.headers.host !== 'localhost:3000') {
        return next(new errors.ForbiddenError());
    }
    return next();
}
