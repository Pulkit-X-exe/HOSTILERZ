// models/Notice.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Notice = sequelize.define(
  "Notice",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    target_role: {
      type: DataTypes.ENUM("all", "student", "warden"),
      defaultValue: "all",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    target_block: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
    },
  },
  {
    tableName: "notices",
  }
);

module.exports = Notice;
