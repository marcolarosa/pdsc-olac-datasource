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
            code: {
                unique: false,
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            }
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['code']}]
        }
    );
    Language.associate = function(models) {
        Language.belongsToMany(models.country, {
            through: 'language_country',
            onDelete: 'cascade'
        });
        Language.hasMany(models.harvest);
    };

    return Language;
};
