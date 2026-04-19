// models/Visitor.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Visitor = sequelize.define(
  "Visitor",
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
    visitor_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    relation: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    check_in: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    id_proof_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "visitors",
  }
);

module.exports = Visitor;
