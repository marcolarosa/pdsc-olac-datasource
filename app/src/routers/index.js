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
    getCountryStats,
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
    // server.post("/update", demandAuthorised, (req, res, next) => {
    //     killExistingUpdaters();
    //     let logfile = `${process.env.PDSC_HARVEST_DOWNLOAD}/last-update.log`;
    //     rm("-f", logfile);
    //     updateLanguageData({ run: 0 });
    //     res.send(200);
    //     return next();
    // });
    server.post("/cleanup", demandAuthorised, (req, res, next) => {
        cleanup();
        res.send(200);
        return next();
    });
    server.get("/dates", getDates);
    server.get("/regions", getRegions);
    server.get("/regions/:region", getRegion);
    server.get("/countries", getCountries);
    server.get("/countries/:country", getCountry);
    server.get("/countries/:country/stats", getCountryStats);
    server.get("/languages", getLanguage);
    server.get("/languages/:code", getLanguage);
    server.get("/languages/:code/resources", getLanguageResources);
    server.post("/regions", demandAuthorised, postRegions);
    server.post("/countries", demandAuthorised, postCountries);
    server.post("/languages", demandAuthorised, postLanguage);
}

function demandAuthorised(req, res, next) {
    if (
        req.headers["x-pdsc-datasource-admin"] !==
        process.env.PDSC_ADMIN_PASSWORD
    ) {
        return next(new errors.ForbiddenError());
    }
    return next();
}
