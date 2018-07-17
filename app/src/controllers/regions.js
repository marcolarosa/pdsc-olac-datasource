'use strict';

const models = require('models').getModels();
const errors = require('restify-errors');
const debugInfo = require('debug')('pdsc:  _info');
const debugError = require('debug')('pdsc: _error');

module.exports = {
    getRegions,
    getRegion,
    postRegions
};

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
