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
    server.get('/languages/:name', getLanguage);
    server.get('/languages/:name/resources', getLanguageResources);
    server.post('/languages', postLanguage);
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

async function loadHarvestDates() {
    let dates = await models.language.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('date')), 'date']]
    });
    dates = dates.map(d => d.get('date'));
    return dates.sort();
}

async function getLanguage(req, res, next) {
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    const language = await models.language.findOne({
        where: {
            name: req.params.name,
            date: date
        },
        attributes: ['id', 'name', 'date', 'metadata']
    });
    if (language) {
        res.send(200, language.get());
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getLanguageResources(req, res, next) {
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    const language = await models.language.findOne({
        where: {
            name: req.params.name,
            date: date
        },
        attributes: ['resources']
    });
    res.send(200, language.get());
    return next();
}

async function postLanguage(req, res, next) {
    if (req.headers.host !== 'localhost:3000') {
        return next(new errors.ForbiddenError());
    }
    if (!req.body.code || !req.body.date) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {...req.body};
        delete data.resources;
        const resources = {...req.body.resources};
        let language = await models.language.findOrCreate({
            where: {name: data.code, date: data.date},
            defaults: {
                name: data.code,
                date: data.date,
                metadata: data.metadata
            }
        });
        language = language[0];
        language.update({metadata: data.metadata, resources});
        res.send(200, language.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }
}
