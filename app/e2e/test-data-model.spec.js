"use strict";

const chai = require("chai");
const chakram = require("chakram");
const expect = chai.expect;
const moment = require("moment");
const models = require("../src/models").getModels();
const { flattenDeep } = require("lodash");
const today = moment().format("YYYYMMDD");
const uri = "http://localhost:3000";
const {
    setup,
    cleanup,
    getLanguage,
    getCountry,
    getRegion
} = require("./utils");

describe("test the database model", () => {
    let region, country, language, harvests;
    before(async () => {
        try {
            const region = await setup();
        } catch (error) {
            console.log(error);
        }
    });
    after(async () => {
        await cleanup();
    });

    it("should be able to get all info related to a language", async () => {
        language = (await getLanguage("aln")).get();
        expect(language.code).to.equal("aln");
        expect(language.countries.length).to.equal(1);
        expect(language.harvests.length).to.equal(2);
    });

    it("should be able to get all info related to a country", async () => {
        country = (await getCountry("Albania")).get();
        expect(country.name).to.equal("Albania");
        harvests = country.languages.map(l => l.get("harvests"));
        harvests = flattenDeep(harvests);
        expect(harvests.length).to.equal(14);
    });

    it("should be able to get all info related to a region", async () => {
        region = (await getRegion("europe")).get();
        expect(region.name).to.equal("europe");
        expect(region.countries.length).to.equal(1);
    });
});
