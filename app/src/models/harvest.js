'use strict';

module.exports = function(sequelize, DataTypes) {
    let Harvest = sequelize.define(
        'harvest',
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4
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
            indexes: [{unique: true, fields: ['date', 'languageId']}]
        }
    );
    Harvest.associate = function(models) {
        Harvest.belongsTo(models.language, {
            onDelete: 'cascade'
        });
    };

    return Harvest;
};
