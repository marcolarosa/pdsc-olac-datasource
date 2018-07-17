'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const {spawn, spawnSync} = require('child_process');
const {throttle} = require('lodash');
let nodeProcess, npmInstallProcess;

let sources = {
    scripts: {
        path: ['./src/**']
    },
    e2e: {
        path: ['./e2e/**']
    }
};

gulp.task('serverManager', serverManager);
gulp.task('unitTestManager', unitTestManager);
gulp.task('integrationTestManager', integrationTestManager);
gulp.task(
    'develop',
    gulp.series(
        'serverManager',
        gulp.parallel('unitTestManager', 'integrationTestManager')
    )
);

function unitTestManager(done) {
    return gulp.watch(
        [`${sources.scripts.path}/*.spec.js`],
        {ignoreInitial: true},
        runUnitTests
    );

    function runUnitTests(done) {
        return gulp
            .src([`${sources.scripts.path}/*.spec.js`])
            .pipe(mocha({bail: true, exit: true}))
            .on('error', function(err) {
                console.log(err.stack);
            })
            .once('end', function() {
                done();
            });
    }
}

function integrationTestManager(done) {
    return gulp.watch(
        [`${sources.e2e.path}/*.spec.js`],
        {ignoreInitial: true},
        runIntegrationTests
    );

    function runIntegrationTests(done) {
        return gulp
            .src([`${sources.e2e.path}/*.spec.js`])
            .pipe(mocha({bail: true, exit: true}))
            .on('error', function(err) {
                console.log(err.stack);
            })
            .once('end', function() {
                done();
            });
    }
}

function serverManager(done) {
    gulp.watch(
        ['./index.js', `${sources.scripts.path}`, 'webpack.develop.js'],
        {
            ignoreInitial: false,
            ignored: ['**/*.spec.js']
        },
        throttle(reloadServer, 10000, {leading: true, trailing: false})
    );
    done();
    function reloadServer(done) {
        spawnSync(
            './node_modules/webpack/bin/webpack.js',
            ['--config', 'webpack.develop.js'],
            {stdio: 'inherit'}
        );
        npmInstallProcess = spawn('npm', ['install'], {
            stdio: 'inherit',
            cwd: './dist'
        });
        if (nodeProcess) nodeProcess.kill();
        if (npmInstallProcess) npmInstallProcess.kill();
        nodeProcess = spawn('node', ['./dist/index.js'], {stdio: 'inherit'});
        nodeProcess.on('close', function(code) {
            if (code === 8) {
                gulp.log('Error detected, waiting for changes...');
            }
        });
        done();
    }
}
