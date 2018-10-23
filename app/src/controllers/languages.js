"use strict";

const models = require("models").getModels();
const errors = require("restify-errors");
const debugInfo = require("debug")("pdsc:  _info");
const debugError = require("debug")("pdsc: _error");
const { loadHarvestDates } = require("controllers");
const { map, compact } = require("lodash");
const fs = require("fs");
const util = require("util");
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const write = util.promisify(fs.writeFile);
const read = util.promisify(fs.readFile);

module.exports = {
    getLanguages,
    getLanguage,
    getLanguageResources,
    postLanguage
};

async function getLanguages(req, res, next) {
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    let languages = await models.language.findAll({
        include: [
            {
                model: models.harvest,
                where: { date },
                attributes: ["date", "metadata"]
            }
        ],
        attributes: ["id", "code"]
    });
    languages = languages.map(l => {
        return {
            id: l.get("id"),
            code: l.get("code"),
            name: l.get("harvests")[0].get("metadata").name
        };
    });
    if (languages) {
        res.send(200, { languages });
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getLanguage(req, res, next) {
    if (!req.params.code) {
        return next(new errors.BadRequestError());
    }
    const dates = await loadHarvestDates();
    const date = req.query.date ? req.query.date : dates.pop();
    const language = await models.language.findOne({
        where: {
            code: req.params.code
        },
        include: [
            {
                model: models.harvest,
                where: { date },
                attributes: ["date", "metadata"]
            }
        ],
        attributes: ["id", "code"]
    });
    if (language) {
        res.send(200, { language: language.get() });
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
}

async function getLanguageResources(req, res, next) {
    if (!req.params.code) {
        return next(new errors.BadRequestError());
    }
    try {
        const dates = await loadHarvestDates();
        const date = req.query.date ? req.query.date : dates.pop();
        let language = await models.language.findOne({
            where: {
                code: req.params.code
            },
            include: [
                {
                    model: models.harvest,
                    where: { date },
                    attributes: ["date", "resources"]
                }
            ],
            attributes: ["id", "code"]
        });
        const resources = await Promise.all(
            language.get("harvests").map(async harvest => {
                let resources = {};
                if (harvest.resources) {
                    resources = await read(harvest.resources);
                    resources = JSON.parse(resources);
                }
                return {
                    date: harvest.date,
                    resources: resources
                };
            })
        );
        res.send(200, { language: resources[0] });
        return next();
    } catch (error) {
        console.log("");
    }
}

async function postLanguage(req, res, next) {
    if (!req.body.code || !req.body.date) {
        return next(new errors.BadRequestError());
    }
    try {
        const data = {
            code: req.body.code,
            date: req.body.date,
            metadata: { ...req.body }
        };

        delete data.metadata.resources;

        await prepareRepository({ date: req.body.date });

        debugInfo(`Create language entry ${data.code}`);
        let language = await createLanguageEntry(data.code);
        let harvest = await createHarvestEntry(data, language);

        debugInfo(`Create harvest entry for date ${req.body.date}`);
        const repo = process.env.PDSC_HARVEST_REPOSITORY;
        const datafile = `${repo}/${req.body.date}/${req.body.code}.json`;

        debugInfo(`Save resources file`);
        await save({ datafile, resources: req.body.resources });
        let summary = map(req.body.resources, (v, k) => {
            const r = {};
            r[k] = v.count;
            return r;
        });
        harvest.update({
            metadata: data.metadata,
            resources: datafile,
            resources_summary: summary
        });
        language = await lookupNewEntry(data.code, data.date);
        res.send(200, language.get());
        return next();
    } catch (error) {
        res.send(200);
        return next();
    }

    async function save({ datafile, resources }) {
        let result = await write(datafile, JSON.stringify(resources));
    }

    async function prepareRepository({ date }) {
        const folder = `${process.env.PDSC_HARVEST_REPOSITORY}/${date}`;
        try {
            let result = await stat(folder);
            if (!result.isDirectory()) {
                console.error(`${folder} exists but is not a folder.`);
                throw new Error(errors.InternalServerError);
            }
        } catch (error) {
            if (error.code === "ENOENT") {
                await mkdir(folder);
            }
        }
    }

    async function createLanguageEntry(code) {
        const language = await models.language.findOrCreate({
            where: { code },
            defaults: {
                code
            }
        });
        return language[0];
    }

    async function createHarvestEntry(data, language) {
        try {
            let harvest = await models.harvest.findOne({
                where: {
                    date: data.date,
                    languageId: language.get("id")
                }
            });
            if (harvest) return harvest;
            harvest = await models.harvest.create({
                date: data.date,
                languageId: language.get("id"),
                metadata: data.metadata
            });
            return harvest;
        } catch (error) {
            console.log(error);
        }

        // const harvest = await models.harvest.findOrCreate({
        //     where: {
        //         date: data.date,
        //         languageId: language.get('id')
        //     },
        //     defaults: {
        //         date: data.date,
        //         languageId: language.get('id'),
        //         metadata: data.metadata,
        //         resources: data.resources
        //     }
        // });
        // return harvest[0];
    }

    async function lookupNewEntry(code, date) {
        return await models.language.findOne({
            where: { code },
            include: [
                {
                    model: models.harvest,
                    where: { date },
                    attributes: ["date", "metadata"]
                }
            ],
            attributes: ["id", "code"]
        });
    }
}
