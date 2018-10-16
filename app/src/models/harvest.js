"use strict";

module.exports = function(sequelize, DataTypes) {
    let Harvest = sequelize.define(
        "harvest",
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
                type: DataTypes.JSONB,
                allowNull: false
            },
            resources: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ""
            },
            resources_summary: {
                type: DataTypes.JSONB
            }
        },
        {
            timestamps: false,
            indexes: [{ unique: true, fields: ["date", "languageId"] }]
        }
    );
    Harvest.associate = function(models) {
        Harvest.belongsTo(models.language, {
            onDelete: "cascade"
        });
    };

    return Harvest;
};
