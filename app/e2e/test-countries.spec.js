"use strict";

const chai = require("chai");
const chakram = require("chakram");
const expect = chai.expect;
const moment = require("moment");
const uri = "http://localhost:3000";
const { setup, cleanup, data } = require("./utils");
const dates = {
    yesterday: moment()
        .subtract(1, "day")
        .format("YYYYMMDD"),
    today: moment().format("YYYYMMDD")
};

describe.only(`test countries endpoints - `, () => {
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

    it("should be able to get a list of countries", async () => {
        const response = (await chakram.get(`${uri}/countries`)).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.length).to.equal(1);
        expect(response.body).to.deep.equal(["Albania"]);
    });

    it("should be able to get a specific country", async () => {
        const response = (await chakram.get(`${uri}/countries/Albania`))
            .response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal("Albania");
        expect(response.body.languages).to.deep.equal(data.languages);
    });

    it("should get the language resource statistics for a given country", async () => {
        const response = (await chakram.get(`${uri}/countries/Albania/stats`))
            .response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.date).to.equal(dates.today);
        response.body.languages.forEach(language => {
            expect(language.stats).to.be.an("array");
        });
    });

    it("should get the language resource statistics for a given country on a given date", async () => {
        const response = (await chakram.get(
            `${uri}/countries/Albania/stats?date=${dates.yesterday}`
        )).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.date).to.equal(dates.yesterday);
        response.body.languages.forEach(language => {
            expect(language.stats).to.be.an("array");
        });
    });

    it("should get the language resource statistics for a given country as csv", async () => {
        const response = (await chakram.get(
            `${uri}/countries/Albania/stats?format=csv`
        )).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.date).to.equal(dates.today);
        response.body.languages.forEach(language => {
            expect(language.stats).to.be.an("array");
        });
    });

    it("should be able to create a country", async () => {
        (await chakram.post(
            `${uri}/countries`,
            {
                name: "Australia",
                languages: ["aaa"]
            },
            { headers }
        )).response;
        const response = (await chakram.get(`${uri}/countries/Australia`))
            .response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.name).to.equal("Australia");
        expect(response.body.languages).to.deep.equal(["aaa"]);
    });

    it("should return not found error looking for an unknown country", async () => {
        const r = await chakram.get(`${uri}/countries/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });
});
