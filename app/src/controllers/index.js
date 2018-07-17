'use strict';

const models = require('models').getModels();
const errors = require('restify-errors');
const debugInfo = require('debug')('pdsc:  _info');
const debugError = require('debug')('pdsc: _error');
const Sequelize = require('sequelize');

module.exports = {
    loadHarvestDates,
    getHelp,
    getDates
};

async function loadHarvestDates() {
    let dates = await models.harvest.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('date')), 'date']]
    });
    dates = dates.map(d => d.get('date'));
    return dates.sort();
}

function getHelp(req, res, next) {
    res.send(200, {
        'API routes': {
            dates: {
                URI: '/dates',
                returns: 'An array of available harvest dates'
            },
            regions: [
                {
                    URI: '/regions',
                    returns: 'The list of regions.'
                },
                {
                    URI: '/regions/{region name}',
                    returns: 'The region and its associated countries.'
                }
            ],
            countries: [
                {
                    URI: '/countries',
                    returns: 'The list of countries.'
                },
                {
                    URI: '/countries/{country name}',
                    returns: 'The countries and its associated languages.'
                }
            ],
            languages: [
                {
                    URI: '/languages/{language code}',
                    returns:
                        'The most recent language data harvested without resources.'
                },
                {
                    URI: '/languages/{language code}?date=20180501',
                    returns:
                        'The language data harvested on 20180501 - again without resources.'
                },
                {
                    URI: '/languages/{language code}/resources',
                    returns: 'The most recent language resources harvested.'
                },
                {
                    URI: '/languages/{language code}/resources?date=20180501',
                    returns: 'The language resources harvested on 20180501.'
                }
            ]
        }
    });
    return next();
}

async function getDates(req, res, next) {
    res.send(200, await loadHarvestDates());
    return next();
}
