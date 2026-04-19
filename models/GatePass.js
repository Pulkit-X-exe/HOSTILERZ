// models/GatePass.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const GatePass = sequelize.define(
  "GatePass",
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
    destination: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    departure_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    return_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    actual_return_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "returned"),
      defaultValue: "pending",
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    warden_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Stores data-URL of QR code PNG (base64)
    qr_code: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    // Unique token used inside the QR payload
    qr_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    pass_type: {
      type: DataTypes.ENUM("day", "overnight", "weekend"),
      defaultValue: "day",
    },
  },
  {
    tableName: "gate_passes",
  }
);

module.exports = GatePass;
