'use strict';

module.exports = {
    wireUpRoutes
};

function wireUpRoutes(server) {
    server.get('/collections', getCollections);
    server.get('/language', getLanguage);
}

function getCollections(req, res, next) {
    res.send(200);
    return next();
}

function getLanguage(req, res, next) {
    res.send(200);
    return next();
}
