// models/Complaint.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Complaint = sequelize.define(
  "Complaint",
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
      category: {
      type: DataTypes.ENUM(
        "maintenance",
        "food",
        "security",
        "cleanliness",
        "cleaning",
        "Housekeeping",
        "electricity",
        "water",
        "internet",
        "other"
      ),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "in_progress", "resolved", "rejected"),
      defaultValue: "pending",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high"),
      defaultValue: "medium",
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    admin_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachment: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    block: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
    },
  },
  {
    tableName: "complaints",
  }
);

module.exports = Complaint;
