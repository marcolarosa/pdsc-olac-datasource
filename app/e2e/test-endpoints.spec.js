'use strict';

const chai = require('chai');
const chakram = require('chakram');
const expect = chai.expect;
const moment = require('moment');
const models = require('../src/models');
const today = moment().format('YYYYMMDD');

describe(`test endpoints - `, () => {
    let uri;
    beforeEach(async () => {
        uri = 'http://localhost:3000';
    });
    afterEach(async () => {
        await models.language.destroy({where: {}});
        await models.collection.destroy({where: {}});
    });

    it('should be able to get a list of collections', async () => {
        await models.collection.create({
            name: today
        });
        const r = await chakram.get(`${uri}/collections`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(1);
        expect(response.body[0]).to.equal(today);
    });
    it('should be able to get a language', async () => {
        await models.collection.create({
            name: today
        });
        await models.language.create({
            name: 'aaa',
            collectionName: today,
            data: {}
        });
        const r = await chakram.get(`${uri}/language/${today}/aaa`);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal('aaa');
        expect(response.body.collectionName).to.equal(today);
    });
    it('should be able to post a blob of language data', async () => {
        const data = {
            code: 'aaa',
            resources: []
        };
        const r = await chakram.post(`${uri}/language`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.data).to.deep.equal(data);
    });
    it('should fail with bad request error', async () => {
        const data = {
            resources: []
        };
        const r = await chakram.post(`${uri}/language`, data);
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });
});
