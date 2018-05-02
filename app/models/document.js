'use strict';

module.exports = function(sequelize, DataTypes) {
    let Document = sequelize.define(
        'document',
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
    Document.associate = function(models) {
        Document.belongsTo(models.collection, {
            onDelete: 'cascade'
        });
    };

    return Document;
};
