'use strict';

const models = require('src/models');
const moment = require('moment');
const errors = require('restify-errors');

module.exports = {
    wireUpRoutes
};

function wireUpRoutes(server) {
    server.get('/collections', getCollections);
    server.get('/language/:collection/:name', getLanguage);
    server.post('/language', postLanguage);
}

async function getCollections(req, res, next) {
    const collections = await models.collection.findAll();
    res.send(200, collections.map(c => c.name));
    return next();
}

async function getLanguage(req, res, next) {
    const language = await models.language.findOne({
        where: {
            name: req.params.name,
            collectionName: req.params.collection
        }
    });
    res.send(200, language.get());
    return next();
}

async function postLanguage(req, res, next) {
    if (req.headers.host !== 'localhost:3000') {
        return next(new errors.ForbiddenError());
    }
    if (!req.body.code) {
        return next(new errors.BadRequestError());
    }
    const data = req.body;
    const today = moment().format('YYYYMMDD');
    const collection = await models.collection.findOrCreate({
        where: {name: today},
        defaults: {name: today}
    });
    const language = await models.language.findOrCreate({
        where: {name: data.code, collectionName: today},
        defaults: {name: data.code, collectionName: today, data: data}
    });
    res.send(200, language[0].get());
    return next;
}
