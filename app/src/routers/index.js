'use strict';

const models = require('../models').getModels();
const moment = require('moment');
const errors = require('restify-errors');
const Sequelize = require('sequelize');

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
        where: {name: req.params.region}
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
    res.send(200, countries.map(c => c.get('name')));
    return next();
}

async function getCountry(req, res, next) {
    if (!req.params.country) {
        return next(new errors.BadRequestError());
    }
    const country = await models.country.findOne({
        where: {name: req.params.country}
    });
    if (country) {
        res.send(200, country.get());
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function loadHarvestDates() {
    let dates = await models.language.findAll({
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
            code: req.params.code,
            date: date
        },
        attributes: ['id', 'code', 'date', 'metadata']
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
    const language = await models.language.findOne({
        where: {
            code: req.params.code,
            date: date
        },
        attributes: ['resources']
    });
    res.send(200, language.get());
    return next();
}

async function postLanguage(req, res, next) {
    if (!req.body.code || !req.body.date) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {...req.body};
        delete data.resources;
        const resources = {...req.body.resources};
        let language = await models.language.findOrCreate({
            where: {code: data.code, date: data.date},
            defaults: {
                code: data.code,
                date: data.date,
                metadata: data.metadata
            }
        });
        language = language[0];
        language.update({metadata: data, resources});
        res.send(200, language.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }
}

async function postRegions(req, res, next) {
    if (!req.body.name || !req.body.countries) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {...req.body};
        let region = await models.region.findOrCreate({
            where: {name: data.name},
            defaults: {
                name: data.name,
                countries: data.countries
            }
        });
        region = region[0];
        region.update({countries: data.countries});
        res.send(200, region.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }
}

async function postCountries(req, res, next) {
    if (!req.body.name || !req.body.languages) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {...req.body};
        let country = await models.country.findOrCreate({
            where: {name: data.name},
            defaults: {
                name: data.name,
                languages: data.languages
            }
        });
        country = country[0];
        country.update({languages: data.languages});
        res.send(200, country.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }
}

function demandLocal(req, res, next) {
    if (req.headers.host !== 'localhost:3000') {
        return next(new errors.ForbiddenError());
    }
    return next();
}
