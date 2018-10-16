"use strict";

const models = require("../src/models").getModels();
const moment = require("moment");
const fs = require("fs");
const dates = [
    moment().format("YYYYMMDD"),
    moment()
        .subtract(1, "day")
        .format("YYYYMMDD")
];
const rp = require("request-promise-native");
const data = {
    region: "europe",
    countries: ["Albania"],
    languages: ["aln", "als", "ell", "mkd", "rmy", "rup", "srp"]
};

module.exports = {
    data,
    setup,
    cleanup,
    getLanguage,
    getCountry,
    getRegion
};

async function cleanup() {
    await models.harvest.destroy({ where: {} });
    await models.language.destroy({ where: {} });
    await models.language_country.destroy({ where: {} });
    await models.region.destroy({ where: {} });
    await models.country.destroy({ where: {} });
}

async function setup() {
    await createRegion();
    await createCountry();
    await createLanguageEntries();

    async function createRegion() {
        const body = {
            name: data.region,
            countries: data.countries
        };
        return await submit("regions", body);
    }

    async function createCountry() {
        const body = {
            name: data.countries[0],
            languages: data.languages
        };
        return await submit("countries", body);
    }

    async function createLanguageEntries() {
        let body;
        for (let date of dates) {
            for (let language of data.languages) {
                body = {
                    code: language,
                    ...JSON.parse(
                        fs.readFileSync(
                            `${__dirname}/test-data/${language}.json`,
                            { encoding: "utf8" }
                        )
                    ),
                    date: date
                };
                await submit("languages", body);
            }
        }
    }

    async function submit(endpoint, body) {
        let options = {
            method: "POST",
            headers: {
                "X-PDSC-DATASOURCE-ADMIN": process.env.PDSC_ADMIN_PASSWORD
            },
            uri: `http://localhost:3000/${endpoint}`,
            body,
            json: true // Automatically stringifies the body to JSON
        };
        return await rp(options);
    }
}

async function getLanguage(code) {
    return await models.language.findOne({
        where: { code },
        include: [
            {
                model: models.country,
                include: [{ model: models.region, raw: true }],
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
        where: { name },
        include: [
            {
                model: models.language,
                include: [{ model: models.harvest }]
            }
        ]
    });
}

async function getRegion(name) {
    return await models.region.findOne({
        where: { name },
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
