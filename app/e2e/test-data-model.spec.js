'use strict';

const chai = require('chai');
const chakram = require('chakram');
const expect = chai.expect;
const moment = require('moment');
const models = require('../src/models').getModels();
const {flattenDeep} = require('lodash');
const today = moment().format('YYYYMMDD');
const uri = 'http://localhost:3000';

describe('test the database model', () => {
    let region, country, language, harvests;
    before(async () => {
        region = await createRegion();
        for (var country of ['Algeria', 'Angola']) {
            country = await createCountry(country, region.get('id'));
            language = await createLanguage('aaa', country.get('id'));
        }
    });
    after(async () => {
        await models.harvest.destroy({where: {}});
        await models.language.destroy({where: {}});
        await models.language_country.destroy({where: {}});
        await models.region.destroy({where: {}});
        await models.country.destroy({where: {}});
    });
    it('should be able to get all info related to a language', async () => {
        language = await getLanguage('aaa');
        // console.log(language)
        expect(language.code).to.equal('aaa');
        expect(language.countries.length).to.equal(2);
        expect(language.harvests.length).to.equal(2);
    });

    it('should be able to get all info related to a country', async () => {
        country = await getCountry('Algeria');
        // console.log(country.get());
        expect(country.name).to.equal('Algeria');
        harvests = country.get('languages').map(l => l.get('harvests'));
        harvests = flattenDeep(harvests);
        expect(harvests.length).to.equal(2);
    });

    it('should be able to get all info related to a region', async () => {
        region = await getRegion('Africa');
        // console.log(region.get());
        expect(region.name).to.equal('Africa');
        expect(region.countries.length).to.equal(2);
    });
});

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

async function createRegion() {
    const region = await models.region.findOrCreate({
        where: {name: 'Africa'},
        defaults: {name: 'Africa'}
    });
    return region[0];
}

async function createCountry(name, regionId) {
    const country = await models.country.findOrCreate({
        where: {name},
        defaults: {name, regionId}
    });
    return country[0];
}

async function createLanguage(code, countryId) {
    let language = await models.language.findOrCreate({
        where: {code},
        defaults: {
            code,
            harvests: [
                {date: '20180501', metadata: {}, resources: {}},
                {date: '20170402', metadata: {}, resources: {}}
            ]
        },
        include: [models.harvest]
    });

    language = await models.language_country.findOrCreate({
        where: {
            languageId: language[0].get('id'),
            countryId: countryId
        },
        defaults: {
            languageId: language[0].get('id'),
            countryId: countryId
        }
    });

    return language[0];
}
