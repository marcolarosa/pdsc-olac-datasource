'use strict';

const Sequelize = require('sequelize');

module.exports = {
    getModels
};

let models = {};

function getModels(force = false) {
    if (Object.keys(models).length && !force) {
        return models;
    }

    let config = {
        db: {
            username: process.env.PDSC_DB_USER,
            password: process.env.PDSC_DB_PASSWORD,
            host: process.env.PDSC_DB_HOST,
            port: process.env.PDSC_DB_PORT,
            dialect: 'postgres',
            database: process.env.PDSC_DB_DATABASE,
            logging: false,
            operatorsAliases: false
        }
    };

    const sequelize = new Sequelize(
        config.db.database,
        config.db.username,
        config.db.password,
        config.db
    );

    let modules = [require('./language.js')];

    // Initialize models
    modules.forEach(module => {
        const model = module(sequelize, Sequelize, config);
        models[model.name] = model;
    });

    // Apply associations
    Object.keys(models).forEach(key => {
        if ('associate' in models[key]) {
            models[key].associate(models);
        }
    });

    models.sequelize = sequelize;
    models.Sequelize = Sequelize;

    return models;
}
