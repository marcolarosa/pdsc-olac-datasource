'use strict';

module.exports = function(sequelize, DataTypes) {
    const Region = sequelize.define(
        'region',
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
            countries: {
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
    Region.associate = function(models) {};

    return Region;
};
