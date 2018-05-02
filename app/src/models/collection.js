'use strict';

module.exports = function(sequelize, DataTypes) {
    let Collection = sequelize.define(
        'collection',
        {
            name: {
                primaryKey: true,
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            }
        },
        {}
    );
    Collection.associate = function(models) {
        Collection.hasMany(models.language, {
            hooks: true,
            onDelete: 'cascade'
        });
    };
    return Collection;
};
