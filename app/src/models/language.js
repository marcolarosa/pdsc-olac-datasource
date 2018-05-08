'use strict';

module.exports = function(sequelize, DataTypes) {
    let Language = sequelize.define(
        'language',
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            date: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            metadata: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: ''
            },
            resources: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: ''
            }
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['name', 'date']}]
        }
    );
    Language.associate = function(models) {};

    return Language;
};
