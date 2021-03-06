"use strict";

const fs = require("fs");
const util = require("util");
const readdir = util.promisify(fs.readdir);
const models = require("models").getModels();
const errors = require("restify-errors");
const debugInfo = require("debug")("pdsc:  _info");
const debugError = require("debug")("pdsc: _error");
const Sequelize = require("sequelize");
const { exec, rm } = require("shelljs");
const { lookup, kill } = require("ps-node");
const moment = require("moment");
const { spawn } = require("child_process");

module.exports = {
    loadHarvestDates,
    getHelp,
    getDates,
    updateLanguageData,
    killExistingUpdaters,
    cleanup
};

async function loadHarvestDates() {
    let dates = await models.harvest.findAll({
        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("date")), "date"]]
    });
    dates = dates.map(d => d.get("date"));
    // always remove the most recent harvest as it may not be complete
    //  seriously - does it matter that we're one day behind?
    dates.pop();
    return dates.sort();
}

function getHelp(req, res, next) {
    res.send(200, {
        "API routes": {
            dates: {
                URI: "/dates",
                returns: "An array of available harvest dates"
            },
            regions: [
                {
                    URI: "/regions",
                    returns: "The list of regions."
                },
                {
                    URI: "/regions/{region name}",
                    returns: "The region and its associated countries."
                }
            ],
            countries: [
                {
                    URI: "/countries",
                    returns: "The list of countries."
                },
                {
                    URI: "/countries/{country name}",
                    returns: "The country and its associated languages."
                },
                {
                    URI: "/countries/{country name}/stats",
                    returns:
                        "The country and its associated languages with resource statistics."
                },
                {
                    URI: "/countries/{country name}/stats?date=20180501",
                    returns:
                        "The country and its associated languages with resource statistics as at date 20180501."
                }
            ],
            languages: [
                {
                    URI: "/languages",
                    returns: "The list of available languages."
                },
                {
                    URI: "/languages?date=20180501",
                    returns:
                        "The list of available languages as at date 20180501."
                },
                {
                    URI: "/languages/{language code}",
                    returns:
                        "The most recent language data harvested without resources."
                },
                {
                    URI: "/languages/{language code}?date=20180501",
                    returns:
                        "The language data harvested on 20180501 - again without resources."
                },
                {
                    URI: "/languages/{language code}/resources",
                    returns: "The most recent language resources harvested."
                },
                {
                    URI: "/languages/{language code}/resources?date=20180501",
                    returns: "The language resources harvested on 20180501."
                }
            ]
        }
    });
    return next();
}

async function getDates(req, res, next) {
    const dates = await loadHarvestDates();
    res.send(200, { dates });
    return next();
}

async function updateLanguageData({ run }) {
    debugInfo(`Running language updater`);
    await killExistingUpdaters();
    let args = [
        "process-language-pages/scraper.py",
        "--languages",
        "process-language-pages/languages.csv",
        "--glotto-languoids",
        "process-language-pages/languoid.csv",
        "--service",
        "http://localhost:3000",
        "--output-folder",
        `${process.env.PDSC_HARVEST_DOWNLOAD}`,
        "--info"
    ];
    // ">",
    // "${process.env.PDSC_HARVEST_DOWNLOAD}/last-update.log",
    // "2>&1"
    // exec(cmd, (code, stdout, stderr) => {
    //     console.log(`Code: ${code}, Error: ${stderr}`);
    // });
    if (run === 3) {
        debugError(`Tried to run language updater 3 times - giving up.`);
        return;
    }
    let logfile = `${process.env.PDSC_HARVEST_DOWNLOAD}/last-update.log`;
    return new Promise((resolve, reject) => {
        let stream = fs.createWriteStream(logfile, { flags: "a" });
        const cmd = spawn("python3", args);
        cmd.stdout.on("data", data => {
            stream.write(data);
        });

        cmd.stderr.on("data", data => {
            stream.write(data);
        });

        cmd.on("close", code => {
            stream.end();
            if (code !== 0) {
                debugError(
                    `Error running language updater - exit code: ${code}`
                );
                updateLanguageData({ run: (run += 1) });
            }
            resolve(code);
        });
    });
}

async function killExistingUpdaters() {
    return new Promise(async (resolve, reject) => {
        let pids = await new Promise((resolve, reject) => {
            lookup(
                {
                    command: "/bin/sh",
                    arguments: ["-c", "python3"]
                },
                (error, processes) => {
                    resolve(processes.map(p => p.pid));
                }
            );
        });
        pids = [
            ...pids,
            ...(await new Promise((resolve, reject) => {
                lookup({ command: "python3" }, (error, processes) => {
                    resolve(processes.map(p => p.pid));
                });
            }))
        ];

        pids.forEach(p => kill(p, "SIGKILL"));
        resolve();
    });
}

async function cleanup() {
    debugInfo(`Running cleanup`);
    let logfile = `${process.env.PDSC_HARVEST_DOWNLOAD}/archiver.log`;
    const today = moment().format("YYYYMMDD");
    rm("-f", logfile);

    await cleanupDatabase();
    await cleanupRepository();
    archiveData();

    function archiveData() {
        let args = [
            "process-language-pages/archiver.py",
            "--data",
            `${process.env.PDSC_HARVEST_DOWNLOAD}`,
            "--info"
        ];
        return new Promise((resolve, reject) => {
            let stream = fs.createWriteStream(logfile, { flags: "a" });
            const cmd = spawn("python3", args);
            cmd.stdout.on("data", data => {
                stream.write(data);
            });

            cmd.stderr.on("data", data => {
                stream.write(data);
            });

            cmd.on("close", code => {
                stream.end();
                resolve(code);
            });
        });
    }

    async function cleanupDatabase() {
        const dates = await loadHarvestDates();
        dates.forEach(async d => {
            const re = /\d\d\d\d\d\d01/;
            if (d !== today && !d.match(re)) {
                await models.harvest.destroy({ where: { date: d } });
            }
        });
    }

    async function cleanupRepository() {
        try {
            const dates = await readdir(process.env.PDSC_HARVEST_REPOSITORY);
            dates.forEach(async d => {
                const re = /\d\d\d\d\d\d01/;
                if (d !== today && !d.match(re)) {
                    debugInfo(
                        `REMOVE: ${process.env.PDSC_HARVEST_REPOSITORY}/${d}`
                    );
                    rm("-rf", `${process.env.PDSC_HARVEST_REPOSITORY}/${d}`);
                }
            });
        } catch (error) {
            debugError(`Error cleaning the repository`);
            console.log(error);
        }
    }
}
