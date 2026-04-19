// models/User.js
const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("student", "admin", "warden"),
      allowNull: false,
    },
    // Used by students
    roll_no: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
    },
    // Used by admins
    admin_id: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
    },
    // Used by wardens
    warden_id: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
    },
    // Which block the warden manages
    block: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    profile_pic: {
      type: DataTypes.STRING(255),
      defaultValue: null,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

// Instance method to compare passwords
User.prototype.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = User;
