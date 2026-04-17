'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Role.hasMany(models.Staff, {
        foreignKey: 'role_code',
        sourceKey: 'role_code',
        as: 'staffMembers'
      });
    }
  }

  Role.init({
    role_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING
    },
    permissions: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue('permissions');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('permissions', value ? JSON.stringify(value) : null);
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Role;
};
