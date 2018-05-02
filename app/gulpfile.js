'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const spawn = require('child_process').spawn;
let node;

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
            .src([
                `${sources.scripts.path}/*.spec.js`,
                '!src/common/node_modules/**/*.spec.js'
            ])
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
        ['./index.js', `${sources.scripts.path}`],
        {
            ignoreInitial: false,
            ignored: ['**/*.spec.js']
        },
        reloadServer
    );
    done();
    function reloadServer(done) {
        if (node) node.kill();
        node = spawn('node', ['index.js'], {stdio: 'inherit'});
        node.on('close', function(code) {
            if (code === 8) {
                gulp.log('Error detected, waiting for changes...');
            }
        });
        done();
    }
}
