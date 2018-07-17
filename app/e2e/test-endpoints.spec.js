'use strict';

const chai = require('chai');
const chakram = require('chakram');
const expect = chai.expect;
const moment = require('moment');
const models = require('../src/models').getModels();
const {flattenDeep} = require('lodash');
const today = moment().format('YYYYMMDD');
const uri = 'http://localhost:3000';
const {setup, cleanup} = require('./utils');

describe(`test endpoints - `, () => {
    let region, country, language, harvest;

    beforeEach(async () => {
        try {
            region = await setup();
        } catch (e) {
            console.log(e);
        }
    });
    afterEach(async () => {
        await cleanup();
    });

    it('should be able to get a list of harvest dates', async () => {
        let r = await chakram.get(`${uri}/dates`);
        let response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(4);
        expect(response.body).to.deep.equal([
            '20170401',
            '20180203',
            '20180501',
            today
        ]);
    });

    it('should be able to get a list of regions', async () => {
        const r = await chakram.get(`${uri}/regions`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(['Africa']);
    });

    it('should be able to get the data for a specific region', async () => {
        const r = await chakram.get(`${uri}/regions/Africa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.countries.length).to.equal(2);
        expect(response.body.countries.map(c => c.name).sort()).to.deep.equal([
            'Algeria',
            'Angola'
        ]);
    });

    it('should return not found error looking for an unknown region', async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });

    it('should be able to get a list of countries', async () => {
        const r = await chakram.get(`${uri}/countries`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.deep.equal(['Algeria', 'Angola']);
    });

    it('should be able to get the data for a specific country', async () => {
        const r = await chakram.get(`${uri}/countries/Algeria`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.languages.length).to.equal(1);
        expect(response.body.languages).to.deep.equal(['aaa']);
    });

    it('should return not found error looking for an unknown country', async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });

    it('should be able to get the latest data for a language', async () => {
        const r = await chakram.get(`${uri}/languages/aaa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal('aaa');
        expect(response.body.harvests.length).to.equal(1);
        harvest = response.body.harvests.filter(h => h.date === today);
        expect(harvest.length).to.equal(1);
        harvest = harvest[0];
        expect(harvest.metadata).to.deep.equal({});
        expect(harvest.resources).to.be.undefined;
    });

    it('should be able to get language data at a given date', async () => {
        const r = await chakram.get(`${uri}/languages/aaa?date=20180501`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal('aaa');
        expect(response.body.harvests.length).to.equal(1);
        harvest = response.body.harvests.filter(h => h.date === '20180501');
        expect(harvest.length).to.equal(1);
        harvest = harvest[0];
        expect(harvest.metadata).to.deep.equal({});
        expect(harvest.resources).to.be.undefined;
    });

    it('should be able to get the resources for a language', async () => {
        const r = await chakram.get(`${uri}/languages/aaa/resources`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(1);
        harvest = response.body.filter(h => h.date === today);
        expect(harvest.length).to.equal(1);
        harvest = harvest[0];
        expect(harvest.resources).to.deep.equal({});
        expect(harvest.metadata).to.be.undefined;
    });

    it('should return not found error looking for an unknown country', async () => {
        const r = await chakram.get(`${uri}/languages/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });

    it('should be able to post a blob of language data', async () => {
        const data = {
            code: 'bbb',
            date: today,
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.code).to.equal('bbb');
        expect(response.body.harvests.length).to.equal(1);
        harvest = response.body.harvests.filter(h => h.date === today);
        expect(harvest.length).to.equal(1);
        harvest = harvest[0];
        expect(harvest.metadata).to.deep.equal({code: 'bbb', date: today});
        expect(harvest.resources).to.be.undefined;
    });

    it('should be able to post a blob of region data', async () => {
        const data = {
            name: 'Africa',
            countries: ['Algeria', 'Angola']
        };
        const r = await chakram.post(`${uri}/regions`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.countries.length).to.equal(2);
        expect(response.body.countries.map(c => c.name).sort()).to.deep.equal([
            'Algeria',
            'Angola'
        ]);
    });

    it('should be able to post a blob of country data', async () => {
        const data = {
            name: 'Algeria',
            languages: ['arq', 'aao']
        };
        const r = await chakram.post(`${uri}/countries`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.languages.length).to.equal(3);
        let languages = response.body.languages.map(l => l.code).sort();
        expect(languages).to.deep.equal(['aaa', 'aao', 'arq']);
    });

    it('should fail with bad request error - missing code', async () => {
        const data = {
            date: today,
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });

    it('should fail with bad request error - missing date', async () => {
        const data = {
            code: 'aaa',
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });
});
