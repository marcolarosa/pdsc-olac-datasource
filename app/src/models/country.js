'use strict';

module.exports = function(sequelize, DataTypes) {
    const Country = sequelize.define(
        'country',
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
            languages: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: ''
            }
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['name']}]
        }
    );
    Country.associate = function(models) {};

    return Country;
};
