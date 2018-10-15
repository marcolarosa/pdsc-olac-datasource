'use strict';


const fs = require("fs");
const util = require("util");
const stat = util.promisify(fs.stat);
const gulp = require("gulp");
const mocha = require("gulp-mocha");
const { throttle } = require("lodash");
const { spawn, spawnSync } = require("child_process");
let nodeProcess;

let src = {
    code: ["./index.js", "./src/**/*.js", "webpack.develop.js"],
    unitTests: ["./src/**/*.spec.js", "!src/common/node_modules/**/*.spec.js"],
    e2eTests: ["./e2e/**/*.spec.js"]
};

gulp.task("serverManager", serverManager);
gulp.task("unitTestManager", unitTestManager);
gulp.task("integrationTestManager", integrationTestManager);
gulp.task("runUnitTests", runUnitTests);
gulp.task("runIntegrationTests", runIntegrationTests);
gulp.task("buildDist", buildDist);
gulp.task(
    "develop",
    gulp.series(
        "buildDist",
        "serverManager",
        gulp.parallel("unitTestManager", "integrationTestManager")
    )
);

function unitTestManager(done) {
    return gulp.watch(src.unitTests, { ignoreInitial: true }, runUnitTests);
}

function runUnitTests(done) {
    return gulp
        .src(src.unitTests)
        .pipe(mocha({ bail: true, exit: true }))
        .on("error", function(err) {
            console.log(err.stack);
        })
        .once("end", function() {
            done();
        });
}

function integrationTestManager(done) {
    return gulp.watch(
        src.e2eTests,
        { ignoreInitial: true },
        runIntegrationTests
    );
}

function runIntegrationTests(done) {
    return gulp
        .src(src.e2eTests)
        .pipe(mocha({ bail: true, exit: true }))
        .on("error", function(err) {
            console.log(err.stack);
        })
        .once("end", function() {
            done();
        });
}

function buildDist(done) {
    spawnSync(
        "./node_modules/.bin/webpack",
        ["--display", "normal", "--config", "webpack.develop.js"],
        { stdio: "inherit" }
    );
    if (done) done();
}

function serverManager(done) {
    gulp.watch(
        src.code,
        {
            ignoreInitial: false,
            ignored: ["./dist", "**/*.spec.js", "./src/common/node_modules"]
        },
        throttle(reloadServer, 10000, { leading: true, trailing: false })
    );
    done();
    async function reloadServer(done) {
        if (nodeProcess) nodeProcess.kill();
        buildDist();
        nodeProcess = spawn("node", ["./dist/index.js"], {
            stdio: "inherit"
        });
        nodeProcess.on("close", function(code) {
            if (code === 8) {
                gulp.log("Error detected, waiting for changes...");
            }
        });
        done();
    }
}