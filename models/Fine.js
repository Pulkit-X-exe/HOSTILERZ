// models/Fine.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Fine = sequelize.define(
  "Fine",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "students", key: "id" },
    },
    roll_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Cached for quick display without join",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("unpaid", "paid"),
      defaultValue: "unpaid",
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    issued_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      comment: "Warden who issued the fine",
    },
  },
  {
    tableName: "fines",
  }
);

module.exports = Fine;
