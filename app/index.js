'use strict';

require('app-module-path/cwd');
require('app-module-path').addPath('src/common/node_modules');
const restify = require('restify');
const routers = require('src/routers');
const models = require('src/models');

setup().then(server => {
    return server.listen(3000, function() {
        console.log(`${server.name} listening at ${server.url}`);
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
        routers.wireUpRoutes(server);
        return server;
    }
}
