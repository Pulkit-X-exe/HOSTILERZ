// models/Fee.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Fee = sequelize.define(
  "Fee",
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
    month: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "e.g. January 2024",
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    status: {
      type: DataTypes.ENUM("paid", "pending", "overdue", "partial"),
      defaultValue: "pending",
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.ENUM("cash", "online", "upi", "cheque"),
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    late_fine: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "fees",
  }
);

module.exports = Fee;
