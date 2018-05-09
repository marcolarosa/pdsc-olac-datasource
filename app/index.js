'use strict';

require('app-module-path/cwd');
require('app-module-path').addPath('src/common/node_modules');
const restify = require('restify');
const models = require('./src/models').getModels();
const {exec} = require('shelljs');
const {lookup, kill} = require('ps-node');
const cronJob = require('cron').CronJob;
const moment = require('moment');
const {loadHarvestDates, wireUpRoutes} = require('./src/routers');

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

async function updateLanguageData() {
    await killExistingUpdaters();
    let cmd = `python3 process-language-pages/scraper.py `;
    cmd += `--languages process-language-pages/languages.csv `;
    cmd += `--glotto-languoids process-language-pages/languoid.csv `;
    cmd += `--service http://localhost:3000 `;
    cmd += `--output-folder /srv/data `;
    // cmd += `--mode development `;
    cmd += `--info > process-language-pages/last-update.log 2>&1`;
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
        cmd += `--data /srv/data `;
        cmd += `--info > process-language-pages/archiver.log 2>&1`;
        exec(cmd, {async: true});
    }

    async function cleanupDatabase() {
        const dates = await loadHarvestDates();
        const today = moment().format('YYYYMMDD');
        dates.forEach(async d => {
            const re = /\d\d\d\d\d\d01/;
            if (d !== today && !d.match(re)) {
                await models.language.destroy({where: {date: d}});
            }
        });
    }
}
