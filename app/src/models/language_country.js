'use strict';

module.exports = function(sequelize, DataTypes) {
    let LanguageCountry = sequelize.define(
        'language_country',
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4
            },
            languageId: {
                type: DataTypes.UUID,
                unique: false,
                allowNull: false
            },
            countryId: {
                type: DataTypes.UUID,
                unique: false,
                allowNull: false
            }
        },
        {
            timestamps: false
        }
    );
    LanguageCountry.associate = function(models) {};

    return LanguageCountry;
};
