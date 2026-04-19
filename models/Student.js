// models/Student.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Student = sequelize.define(
  "Student",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
    },
    roll_no: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    course: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    guardian_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    guardian_contact: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "rooms", key: "id" },
    },
    room_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    profile_pic: {
      type: DataTypes.STRING(255),
      defaultValue: null,
    },
    join_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
      defaultValue: "male",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "students",
  }
);

module.exports = Student;
