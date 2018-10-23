"use strict";

const chai = require("chai");
const chakram = require("chakram");
const expect = chai.expect;
const moment = require("moment");
const fs = require("fs");
const uri = "http://localhost:3000";
const { setup, cleanup, data } = require("./utils");
const dates = {
    yesterday: moment()
        .subtract(1, "day")
        .format("YYYYMMDD"),
    today: moment().format("YYYYMMDD")
};

describe(`test languages endpoints - `, () => {
    let region, country, language, harvest;
    const headers = {
        "X-PDSC-DATASOURCE-ADMIN": process.env.PDSC_ADMIN_PASSWORD
    };

    before(async () => {
        try {
            await setup();
        } catch (e) {
            console.log(e);
        }
    });
    after(async () => {
        await cleanup();
    });

    it("should be able to get a list of all languages", async () => {
        const response = (await chakram.get(`${uri}/languages`)).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.languages).length(7);
    });
    it("should be able to get the data for a language", async () => {
        const response = (await chakram.get(
            `${uri}/languages/${data.languages[0]}`
        )).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.language.code).to.equal(data.languages[0]);
        expect(response.body.language.harvests.length).to.equal(1);
        const harvest = response.body.language.harvests[0];
        expect(harvest.date).to.equal(dates.today);
    });

    it("should be able to get the data for a language at a different date", async () => {
        const response = (await chakram.get(
            `${uri}/languages/${data.languages[0]}?date=${dates.yesterday}`
        )).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.language.code).to.equal(data.languages[0]);
        expect(response.body.language.harvests.length).to.equal(1);
        const harvest = response.body.language.harvests[0];
        expect(harvest.date).to.equal(dates.yesterday);
    });

    it("should be able to get the resources for a language", async () => {
        const response = (await chakram.get(
            `${uri}/languages/${data.languages[0]}/resources`
        )).response;
        expect(response.statusCode).to.equal(200);
        const resources = response.body.language.resources;
        expect(resources["Lexical resources"].count).to.equal(1);
        expect(resources["Other resources about the language"].count).to.equal(
            13
        );
        expect(resources["Language descriptions"].count).to.equal(6);
    });

    it("should be able to get the resources for a language at a different date", async () => {
        const response = (await chakram.get(
            `${uri}/languages/${data.languages[0]}/resources?date=${
                dates.yesterday
            }`
        )).response;
        expect(response.statusCode).to.equal(200);
        const resources = response.body.language.resources;
        expect(resources["Lexical resources"].count).to.equal(1);
        expect(resources["Other resources about the language"].count).to.equal(
            13
        );
        expect(resources["Language descriptions"].count).to.equal(6);
    });

    it("should be able to create a language entry", async () => {
        let data = {
            ...JSON.parse(
                fs.readFileSync(`${__dirname}/test-data/aln.json`, {
                    encoding: "utf8"
                })
            ),
            code: "aaa",
            date: dates.today
        };
        (await chakram.post(`${uri}/languages`, data, { headers })).response;
        const response = (await chakram.get(`${uri}/languages/aaa`)).response;
        expect(response.statusCode).to.equal(200);
    });

    it("should return not found error looking for an unknown language", async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });
    it("should fail with bad request error - missing code", async () => {
        const data = {
            date: dates[1],
            resources: {}
        };
        const headers = {
            "X-PDSC-DATASOURCE-ADMIN": process.env.PDSC_ADMIN_PASSWORD
        };
        const r = await chakram.post(`${uri}/languages`, data, { headers });
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });

    it("should fail with bad request error - missing date", async () => {
        const data = {
            code: "aaa",
            resources: {}
        };
        const headers = {
            "X-PDSC-DATASOURCE-ADMIN": process.env.PDSC_ADMIN_PASSWORD
        };
        const r = await chakram.post(`${uri}/languages`, data, { headers });
        const response = r.response;
        expect(response.statusCode).to.equal(400);
    });

    it("should fail with forbidden error - missing headers", async () => {
        const data = { code: "aaa", resources: {} };
        const headers = {};
        const r = await chakram.post(`${uri}/languages`, data, { headers });
        const response = r.response;
        expect(response.statusCode).to.equal(403);
    });
});
