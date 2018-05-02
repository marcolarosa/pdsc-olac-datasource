'use strict';

module.exports = function(sequelize, DataTypes) {
    let Language = sequelize.define(
        'language',
        {
            name: {
                primaryKey: true,
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            data: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: ''
            }
        },
        {
            timestamps: false
        }
    );
    Language.associate = function(models) {
        Language.belongsTo(models.collection, {
            onDelete: 'cascade'
        });
    };

    return Language;
};
