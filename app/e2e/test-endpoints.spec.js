'use strict';

const chai = require('chai');
const chakram = require('chakram');
const expect = chai.expect;
const moment = require('moment');
const models = require('../src/models').getModels();
const today = moment().format('YYYYMMDD');
const uri = 'http://localhost:3000';

describe(`test endpoints - `, () => {
    beforeEach(async () => {});
    afterEach(async () => {
        await models.language.destroy({where: {}});
        await models.region.destroy({where: {}});
        await models.country.destroy({where: {}});
    });

    it('should be able to get a list of harvest dates', async () => {
        await models.language.create({
            code: 'aaa',
            date: today,
            data: {}
        });

        let r = await chakram.get(`${uri}/dates`);
        let response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(1);
        expect(response.body[0]).to.equal(today);
        await models.language.destroy({where: {}});

        for (let date of ['20170401', '20180501', '20180203']) {
            const data = {};
            await models.language.create({code: 'aaa', date, data});
        }
        r = await chakram.get(`${uri}/dates`);
        response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(3);
        expect(response.body).to.deep.equal([
            '20170401',
            '20180203',
            '20180501'
        ]);
    });

    it('should be able to get a list of regions', async () => {
        await models.region.create({
            name: 'Africa',
            countries: ['Algeria', 'Angola']
        });
        const r = await chakram.get(`${uri}/regions`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(['Africa']);
    });

    it('should be able to get the data for a specific region', async () => {
        const region = await models.region.create({
            name: 'Africa',
            countries: ['Algeria', 'Angola']
        });
        const r = await chakram.get(`${uri}/regions/Africa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(region.get());
    });

    it('should return not found error looking for an unknown region', async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });
    it('should be able to get a list of countries', async () => {
        await models.country.create({
            name: 'Algeria',
            languages: ['arq', 'aao']
        });
        const r = await chakram.get(`${uri}/countries`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(['Algeria']);
    });

    it('should be able to get the data for a specific country', async () => {
        const country = await models.country.create({
            name: 'Algeria',
            languages: ['arq', 'aao']
        });
        const r = await chakram.get(`${uri}/countries/Algeria`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(country.get());
    });

    it('should return not found error looking for an unknown country', async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });

    it('should be able to get the latest data for a language', async () => {
        const language = await models.language.create({
            code: 'aaa',
            date: today,
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal('aaa');
        expect(response.body.date).to.equal(today);
    });

    it('should be able to get language data at a given date', async () => {
        const language = await models.language.create({
            code: 'aaa',
            date: '20180501',
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa?date=20180501`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal('aaa');
        expect(response.body.date).to.equal('20180501');
    });

    it('should be able to get the metadata for a language', async () => {
        const language = await models.language.create({
            code: 'aaa',
            date: today,
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa/resources`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.resources).to.deep.equal({});
    });

    it('should return not found error looking for an unknown country', async () => {
        const r = await chakram.get(`${uri}/languages/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });

    it('should be able to post a blob of language data', async () => {
        const data = {
            code: 'aaa',
            date: today,
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal(data.code);
        expect(response.body.date).to.equal(data.date);
        expect(response.body.resources).to.deep.equal(data.resources);
    });

    it('should be able to post a blob of region data', async () => {
        const data = {
            name: 'Africa',
            countries: ['Algeria', 'Angola']
        };
        const r = await chakram.post(`${uri}/regions`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal(data.name);
        expect(response.body.countries).to.deep.equal(data.countries);
    });

    it('should be able to post a blob of country data', async () => {
        const data = {
            name: 'Algeria',
            languages: ['arq', 'aao']
        };
        const r = await chakram.post(`${uri}/countries`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal(data.name);
        expect(response.body.languages).to.deep.equal(data.languages);
    });

    it('should fail with bad request error - missing code', async () => {
        const data = {
            date: today,
            metadata: {},
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });

    it('should fail with bad request error - missing date', async () => {
        const data = {
            code: 'aaa',
            metadata: {},
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });
});
