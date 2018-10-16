"use strict";
require("babel-polyfill");
require("source-map-support").install();
const restify = require("restify");
const models = require("models").getModels();
const cronJob = require("cron").CronJob;
const { wireUpRoutes } = require("routers");
const {
    updateLanguageData,
    killExistingUpdaters,
    cleanup
} = require("controllers");
const fs = require("fs");
const util = require("util");
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);

prepareRepository();
setup().then(server => {
    return server.listen(process.env.PDSC_SERVER_PORT, async () => {
        console.log(`${server.name} listening at ${server.url}`);
        // new cronJob(
        //     "00 00 2 * * *",
        //     updateLanguageData,
        //     () => {},
        //     true,
        //     "Australia/Melbourne"
        // );
        // await killExistingUpdaters();
        new cronJob(
            "00 00 4 * * *",
            cleanup,
            () => {},
            true,
            "Australia/Melbourne"
        );
        cleanup();
    });
});

function setup() {
    return models.sequelize
        .sync()
        .then(() => {
            console.log("DB connection established successfully.");
            return createServer();
        })
        .catch(e => {
            console.log("Couldn't initialise application.");
            console.log(e.message);
            process.exit(-1);
        });

    function createServer() {
        const server = restify.createServer();
        server.server.timeout = 60000 * 5;
        server.name = "OLAC Datasource";
        server.use(restify.plugins.acceptParser(server.acceptable));
        server.use(restify.plugins.dateParser());
        server.use(restify.plugins.queryParser());
        server.use(restify.plugins.jsonp());
        server.use(restify.plugins.gzipResponse());
        server.use(restify.plugins.bodyParser());
        server.use(restify.plugins.conditionalRequest());
        wireUpRoutes(server);
        return server;
    }
}

async function prepareRepository() {
    let folder = process.env.PDSC_HARVEST_REPOSITORY;
    try {
        let result = await stat(folder);
        if (!result.isDirectory()) {
            console.error(`${folder} exists but is not a folder.`);
            console.error("Exiting now");
            process.exit();
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            await mkdir(folder);
        }
    }

    folder = process.env.PDSC_HARVEST_DOWNLOAD;
    try {
        let result = await stat(folder);
        if (!result.isDirectory()) {
            console.error(`${folder} exists but is not a folder.`);
            console.error("Exiting now");
            process.exit();
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            await mkdir(folder);
        }
    }
}
