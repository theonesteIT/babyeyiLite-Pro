'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Staff.belongsTo(models.Role, {
        foreignKey: 'role_code',
        targetKey: 'role_code',
        as: 'role'
      });
    }
  }

  Staff.init({
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    school_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.STRING,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    rfid_uid: {
      type: DataTypes.STRING,
      unique: true
    },
    fingerprint_id: {
      type: DataTypes.STRING,
      unique: true
    },
    identity_remarks: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Staff',
    tableName: 'staff',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false // Schema shows only created_at
  });

  return Staff;
};
