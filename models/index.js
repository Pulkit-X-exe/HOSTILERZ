// models/index.js  –  loads all models and wires up associations
const User = require("./User");
const Room = require("./Room");
const Student = require("./Student");
const Fee = require("./Fee");
const Fine = require("./Fine");
const Complaint = require("./Complaint");
const GatePass = require("./GatePass");
const Attendance = require("./Attendance");
const Notice = require("./Notice");
const Visitor = require("./Visitor");
const Notification = require("./Notification");

// ── Associations ─────────────────────────────────────────────────────────────

// User ↔ Student (1:1)
User.hasOne(Student, { foreignKey: "user_id", as: "studentProfile" });
Student.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Room ↔ Student (1:many)
Room.hasMany(Student, { foreignKey: "room_id", as: "students" });
Student.belongsTo(Room, { foreignKey: "room_id", as: "room" });

// Student ↔ Fee (1:many)
Student.hasMany(Fee, { foreignKey: "student_id", as: "fees" });
Fee.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// Student ↔ Complaint (1:many)
Student.hasMany(Complaint, { foreignKey: "student_id", as: "complaints" });
Complaint.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// Student ↔ GatePass (1:many)
Student.hasMany(GatePass, { foreignKey: "student_id", as: "gatePasses" });
GatePass.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// User(Warden) → GatePass (approved_by)
User.hasMany(GatePass, { foreignKey: "approved_by", as: "approvedPasses" });
GatePass.belongsTo(User, { foreignKey: "approved_by", as: "approvedByUser" });

// Student ↔ Attendance (1:many)
Student.hasMany(Attendance, { foreignKey: "student_id", as: "attendance" });
Attendance.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// User → Notice (created_by)
User.hasMany(Notice, { foreignKey: "created_by", as: "notices" });
Notice.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// Student ↔ Visitor (1:many)
Student.hasMany(Visitor, { foreignKey: "student_id", as: "visitors" });
Visitor.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// Student ↔ Notification (1:many)
Student.hasMany(Notification, { foreignKey: "student_id", as: "notifications" });
Notification.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// Student ↔ Fine (1:many)
Student.hasMany(Fine, { foreignKey: "student_id", as: "fines" });
Fine.belongsTo(Student, { foreignKey: "student_id", as: "student" });

// User(Warden) → Fine (issued_by)
User.hasMany(Fine, { foreignKey: "issued_by", as: "issuedFines" });
Fine.belongsTo(User, { foreignKey: "issued_by", as: "issuedByUser" });

module.exports = {
  User,
  Room,
  Student,
  Fee,
  Complaint,
  GatePass,
  Attendance,
  Notice,
  Visitor,
  Notification,
  Fine,
};
