"use strict";

const chai = require("chai");
const chakram = require("chakram");
const expect = chai.expect;
const moment = require("moment");
const uri = "http://localhost:3000";
const { setup, cleanup } = require("./utils");
const dates = [
    moment()
        .subtract(1, "day")
        .format("YYYYMMDD"),
    moment().format("YYYYMMDD")
];

describe(`test regions endpoints - `, () => {
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

    it("should be able to get a list of regions", async () => {
        const response = (await chakram.get(`${uri}/regions`)).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.regions.length).to.equal(1);
        expect(response.body.regions).to.deep.equal(["europe"]);
    });

    it("should be able to get a specific region", async () => {
        const response = (await chakram.get(`${uri}/regions/europe`)).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.region.name).to.equal("europe");
        expect(response.body.region.countries).to.deep.equal([
            { name: "Albania" }
        ]);
    });

    it("should be able to create a region", async () => {
        (await chakram.post(
            `${uri}/regions`,
            {
                name: "oceania",
                countries: ["Australia"]
            },
            { headers }
        )).response;
        const response = (await chakram.get(`${uri}/regions/oceania`)).response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.region.countries.length).to.equal(1);
        expect(
            response.body.region.countries.map(c => c.name).sort()
        ).to.deep.equal(["Australia"]);
    });

    it("should return not found error looking for an unknown region", async () => {
        const r = await chakram.get(`${uri}/regions/unknown`);
        const response = r.response;
        expect(response.statusCode).to.equal(404);
    });
});
