'use strict';

const models = require('src/models');
const moment = require('moment');
const errors = require('restify-errors');

module.exports = {
    wireUpRoutes
};

function wireUpRoutes(server) {
    server.get('/collections', getCollections);
    server.del('/collections/:collection', deleteCollection);
    server.get('/language/:collection/:name', getLanguage);
    server.post('/language', postLanguage);
}

async function getCollections(req, res, next) {
    const collections = await models.collection.findAll();
    res.send(200, collections.map(c => c.name));
    return next();
}

async function deleteCollection(req, res, next) {
    if (req.headers.host !== 'localhost:3000') {
        return next(new errors.ForbiddenError());
    }
    if (!req.params.collection) {
        return next(new errors.BadRequestError());
    }
    await models.collection.destroy({where: {name: req.params.name}});
    res.send(200);
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
    try {
        const data = req.body;
        const collection = await models.collection.findOrCreate({
            where: {name: data.date},
            defaults: {name: data.date}
        });
        let language = await models.language.findOrCreate({
            where: {name: data.code, collectionName: data.date},
            defaults: {name: data.code, collectionName: data.date, data: data}
        });
        language = language[0];
        language.update({data: data});
        res.send(200, language.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }
}
