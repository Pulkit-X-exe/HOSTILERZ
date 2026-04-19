// models/Attendance.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Attendance = sequelize.define(
  "Attendance",
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("present", "absent", "late", "on_leave"),
      allowNull: false,
    },
    marked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
    remarks: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    check_in_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
  },
  {
    tableName: "attendance",
    indexes: [
      {
        unique: true,
        fields: ["student_id", "date"],
      },
    ],
  }
);

module.exports = Attendance;
