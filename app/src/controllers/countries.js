"use strict";

const models = require("models").getModels();
const errors = require("restify-errors");
const debugInfo = require("debug")("pdsc:  _info");
const debugError = require("debug")("pdsc: _error");
const { loadHarvestDates } = require("controllers");
const { map, compact } = require("lodash");

module.exports = {
    getCountries,
    getCountry,
    getCountryStats,
    postCountries
};

async function getCountries(req, res, next) {
    const countries = await models.country.findAll();
    res.send(200, countries.map(c => c.get("name")).sort());
    return next();
}

async function getCountry(req, res, next) {
    if (!req.params.country) {
        return next(new errors.BadRequestError());
    }
    let country = await models.country.findOne({
        where: { name: req.params.country },
        attributes: ["name"],
        include: [{ model: models.language, attributes: ["code"], raw: true }]
    });
    if (country) {
        country = country.get();
        country.languages = country.languages.map(l => l.code).sort();
        res.send(200, country);
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getCountryStats(req, res, next) {
    if (!req.params.country) {
        return next(new errors.BadRequestError());
    }
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    // const format = req.query.format === "csv" ? req.query.format : "json";

    let country = await models.country.findOne({
        where: { name: req.params.country },
        attributes: ["name"],
        include: [
            {
                model: models.language,
                include: [
                    {
                        model: models.harvest,
                        where: { date },
                        attributes: ["resources_summary"]
                    }
                ]
            }
        ]
    });
    if (country) {
        let languages = country.languages.map(l => {
            return {
                code: l.get("code"),
                stats: l.harvests[0].get("resources_summary")
            };
        });
        res.send(200, { name: country.get("name"), date, languages });
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function postCountries(req, res, next) {
    if (!req.body.name || !req.body.languages) {
        return next(new errors.BadRequestError());
    }
    try {
        debugInfo(`Create country ${req.body.name}`);
        let country = await createCountryEntry(req.body.name);
        debugInfo(`Create country language entries and mappings`);
        await createLanguageEntries(req.body.languages, country);
        country = await lookupNewEntry(country.get("name"));
        res.send(200, country.get());
        return next();
    } catch (error) {
        console.log(error);
        console.log(req.body);
        res.send(200);
        return next();
    }

    async function createCountryEntry(name) {
        const country = await models.country.findOrCreate({
            where: { name },
            defaults: { name }
        });
        return country[0];
    }

    async function createLanguageEntries(languages, country) {
        let data, language;
        for (let code of languages) {
            language = await models.language.findOrCreate({
                where: { code },
                defaults: { code }
            });
            language = language[0];
            data = {
                languageId: language.get("id"),
                countryId: country.get("id")
            };
            await models.language_country.findOrCreate({
                where: data,
                defaults: data
            });
        }
    }

    async function lookupNewEntry(name) {
        return await models.country.findOne({
            where: { name },
            include: [{ model: models.language }]
        });
    }
}

function formatAsCSV(languages) {
    let categories = {};
    languages.forEach(language =>
        language.stats.forEach(s => {
            let key = Object.keys(s)[0];
            categories[key] = "";
        })
    );
    categories = Object.keys(categories).sort();
    console.log(categories);

    let csv = languages.map(language => {
        let result = [];
        result.push(language.code);

        let stats = {};
        language.stats.forEach(s => (stats = { ...stats, ...s }));
        categories.forEach(category => {
            result.push(stats[category] || 0);
        });
        return result;
    });
    return { categories, csv };
}
