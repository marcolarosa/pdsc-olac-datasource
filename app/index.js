'use strict';
require('babel-polyfill');
require('app-module-path/cwd');
require('app-module-path').addPath('src/common/node_modules');
const restify = require('restify');
const models = require('models').getModels();
const {exec} = require('shelljs');
const {lookup, kill} = require('ps-node');
const cronJob = require('cron').CronJob;
const moment = require('moment');
const {wireUpRoutes} = require('routers');
const {loadHarvestDates} = require('controllers');
const fs = require('fs');
const util = require('util');
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);

prepareRepository();
setup().then(server => {
    return server.listen(3000, async () => {
        console.log(`${server.name} listening at ${server.url}`);
        new cronJob(
            '00 00 2 * * *',
            updateLanguageData,
            cleanup,
            true,
            'Australia/Melbourne'
        );
        await killExistingUpdaters();
        // updateLanguageData();
        cleanup();
    });
});

function setup() {
    return models.sequelize
        .sync()
        .then(() => {
            console.log('DB connection established successfully.');
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
        server.name = 'OLAC Datasource';
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
            console.error('Exiting now');
            process.exit();
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            await mkdir(folder);
        }
    }

    folder = process.env.PDSC_HARVEST_DOWNLOAD;
    try {
        let result = await stat(folder);
        if (!result.isDirectory()) {
            console.error(`${folder} exists but is not a folder.`);
            console.error('Exiting now');
            process.exit();
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            await mkdir(folder);
        }
    }
}

async function updateLanguageData() {
    await killExistingUpdaters();
    let cmd = `python3 process-language-pages/scraper.py `;
    cmd += `--languages process-language-pages/languages.csv `;
    cmd += `--glotto-languoids process-language-pages/languoid.csv `;
    cmd += `--service http://localhost:3000 `;
    cmd += `--output-folder ${process.env.PDSC_HARVEST_DOWNLOAD} `;
    // cmd += `--mode development `;
    cmd += `--info > ${process.env.PDSC_HARVEST_DOWNLOAD}/last-update.log 2>&1`;
    exec(cmd, {async: true});
}

async function killExistingUpdaters() {
    return new Promise(async (resolve, reject) => {
        let pids = await new Promise((resolve, reject) => {
            lookup(
                {
                    command: '/bin/sh',
                    arguments: ['-c', 'python3']
                },
                (error, processes) => {
                    resolve(processes.map(p => p.pid));
                }
            );
        });
        pids = [
            ...pids,
            ...(await new Promise((resolve, reject) => {
                lookup({command: 'python3'}, (error, processes) => {
                    resolve(processes.map(p => p.pid));
                });
            }))
        ];

        pids.forEach(p => kill(p, 'SIGKILL'));
        resolve();
    });
}

async function cleanup() {
    await cleanupDatabase();
    archiveData();

    function archiveData() {
        let cmd = `python3 process-language-pages/archiver.py `;
        cmd += `--data ${process.env.PDSC_HARVEST_DOWNLOAD} `;
        cmd += `--info > ${
            process.env.PDSC_HARVEST_DOWNLOAD
        }/archiver.log 2>&1`;
        exec(cmd, {async: true});
    }

    async function cleanupDatabase() {
        const dates = await loadHarvestDates();
        const today = moment().format('YYYYMMDD');
        dates.forEach(async d => {
            const re = /\d\d\d\d\d\d01/;
            if (d !== today && !d.match(re)) {
                await models.harvest.destroy({where: {date: d}});
            }
        });
    }
}
