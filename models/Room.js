// models/Room.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    room_number: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    block: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: false,
    },
    floor: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM("single", "double", "triple"),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    current_occupancy: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("available", "occupied", "maintenance"),
      defaultValue: "available",
    },
    monthly_rent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    amenities: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    tableName: "rooms",
  }
);

module.exports = Room;
