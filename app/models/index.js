'use strict';

require('app-module-path/cwd');
const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);
const Sequelize = require('sequelize');
const db = {};

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

let sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    config.db
);

fs
    .readdirSync(__dirname)
    .filter(
        file =>
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js'
    )
    .forEach(file => {
        const model = require(`./${file}`)(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
