'use strict';

const models = require('../src/models').getModels();
const moment = require('moment');
const today = moment().format('YYYYMMDD');

module.exports = {
    setup,
    cleanup,
    getLanguage,
    getCountry,
    getRegion
};

async function cleanup() {
    await models.harvest.destroy({where: {}});
    await models.language.destroy({where: {}});
    await models.language_country.destroy({where: {}});
    await models.region.destroy({where: {}});
    await models.country.destroy({where: {}});
}

async function setup() {
    let region = await models.region.create(
        {
            name: 'Africa',
            countries: [{name: 'Algeria'}, {name: 'Angola'}]
        },
        {
            include: [models.country]
        }
    );

    let language = await models.language.create(
        {
            code: 'aaa',
            harvests: [{date: today, metadata: {}, resources: ''}]
        },
        {include: [models.harvest]}
    );
    for (let country of ['Algeria', 'Angola']) {
        country = await models.country.findOne({where: {name: country}});
        await models.language_country.create({
            languageId: language.get('id'),
            countryId: country.get('id')
        });
    }

    for (let date of ['20170401', '20180501', '20180203']) {
        await models.harvest.create({
            languageId: language.get('id'),
            date: date,
            metadata: {},
            resources: ''
        });
    }

    return await models.region.findOne({
        where: {name: 'Africa'},
        include: [
            {
                model: models.country,
                include: [
                    {
                        model: models.language,
                        include: [{model: models.harvest}]
                    }
                ]
            }
        ]
    });
}

async function getLanguage(code) {
    return await models.language.findOne({
        where: {code},
        include: [
            {
                model: models.country,
                include: [{model: models.region, raw: true}],
                raw: true
            },
            {
                model: models.harvest
            }
        ]
    });
}

async function getCountry(name) {
    return await models.country.findOne({
        where: {name},
        include: [
            {
                model: models.language,
                include: [{model: models.harvest}]
            }
        ]
    });
}

async function getRegion(name) {
    return await models.region.findOne({
        where: {name},
        include: [
            {
                model: models.country,
                include: [
                    {
                        model: models.language
                    }
                ]
            }
        ]
    });
}
