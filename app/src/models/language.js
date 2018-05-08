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
            data: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: ''
            }
        },
        {
            timestamps: false,
            indexes: [{unique: true, fields: ['name', 'collectionName']}]
        }
    );
    Language.associate = function(models) {
        Language.belongsTo(models.collection, {
            onDelete: 'cascade'
        });
    };

    return Language;
};
