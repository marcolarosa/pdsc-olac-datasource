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

describe(`test endpoints - `, () => {
    let region, country, language, harvest;

    before(async () => {
        try {
            region = await setup();
        } catch (e) {
            console.log(e);
        }
    });
    after(async () => {
        await cleanup();
    });

    it("should be able to get a list of harvest dates", async () => {
        let r = await chakram.get(`${uri}/dates`);
        let response = r.response;
        expect(response.statusCode).to.equal(200);
        expect(response.body.dates.length).to.equal(2);
        expect(response.body.dates.sort()).to.deep.equal(dates);
    });
});
