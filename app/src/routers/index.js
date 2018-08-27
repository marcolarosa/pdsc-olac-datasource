"use strict";

const models = require("../models").getModels();
const moment = require("moment");
const errors = require("restify-errors");
const debugInfo = require("debug")("pdsc:  _info");
const debugError = require("debug")("pdsc: _error");
const Sequelize = require("sequelize");
const { rm } = require("shelljs");
const { getRegions, getRegion, postRegions } = require("controllers/regions");
const {
    getCountries,
    getCountry,
    postCountries
} = require("controllers/countries");
const {
    getLanguage,
    getLanguageResources,
    postLanguage
} = require("controllers/languages");

module.exports = {
    wireUpRoutes
};
const {
    getHelp,
    getDates,
    updateLanguageData,
    cleanup,
    killExistingUpdaters
} = require("controllers");

function wireUpRoutes(server) {
    server.get("/", getHelp);
    server.get("/update", demandLocal, (req, res, next) => {
        killExistingUpdaters();
        let logfile = `${process.env.PDSC_HARVEST_DOWNLOAD}/last-update.log`;
        rm("-f", logfile);
        updateLanguageData({ run: 0 });
        res.send(200);
        return next();
    });
    server.get("/cleanup", demandLocal, (req, res, next) => {
        cleanup();
        res.send(200);
        return next();
    });
    server.get("/dates", getDates);
    server.get("/regions", getRegions);
    server.get("/regions/:region", getRegion);
    server.get("/countries", getCountries);
    server.get("/countries/:country", getCountry);
    server.get("/languages", getLanguage);
    server.get("/languages/:code", getLanguage);
    server.get("/languages/:code/resources", getLanguageResources);
    server.post("/regions", demandLocal, postRegions);
    server.post("/countries", demandLocal, postCountries);
    server.post("/languages", demandLocal, postLanguage);
}

function demandLocal(req, res, next) {
    if (req.headers.host !== "localhost:3000") {
        return next(new errors.ForbiddenError());
    }
    return next();
}
