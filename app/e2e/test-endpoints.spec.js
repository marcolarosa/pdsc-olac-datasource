'use strict';

const chai = require('chai');
const chakram = require('chakram');
const expect = chai.expect;
const moment = require('moment');
const models = require('../src/models');
const today = moment().format('YYYYMMDD');
const uri = 'http://localhost:3000';

describe(`test endpoints - `, () => {
    beforeEach(async () => {});
    afterEach(async () => {
        await models.language.destroy({where: {}});
    });

    it('should be able to get a list of harvest dates', async () => {
        await models.language.create({
            name: 'aaa',
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
            await models.language.create({name: 'aaa', date, data});
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

    it('should be able to get the latest data for a language', async () => {
        const language = await models.language.create({
            name: 'aaa',
            date: today,
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal('aaa');
        expect(response.body.date).to.equal(today);
    });

    it('should be able to get language data at a given date', async () => {
        const language = await models.language.create({
            name: 'aaa',
            date: '20180501',
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa?date=20180501`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal('aaa');
        expect(response.body.date).to.equal('20180501');
    });

    it('should be able to get the metadata for a language', async () => {
        const language = await models.language.create({
            name: 'aaa',
            date: today,
            metadata: {},
            resources: {}
        });
        const r = await chakram.get(`${uri}/languages/aaa/resources`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.resources).to.deep.equal({});
    });

    it('should be able to post a blob of language data', async () => {
        const data = {
            code: 'aaa',
            date: today,
            metadata: {},
            resources: {}
        };
        const r = await chakram.post(`${uri}/languages`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
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
