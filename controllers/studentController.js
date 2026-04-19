// controllers/studentController.js
const { Op } = require("sequelize");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const { Student, Room, Fee, Fine, Complaint, GatePass, Attendance, Notice, User, Notification } = require("../models");

// ── Helper: get student record from logged-in user ────────────────────────────
const getStudentByUserId = async (userId) => {
  const student = await Student.findOne({
    where: { user_id: userId },
    include: [{ model: Room, as: "room" }],
  });
  if (!student) throw Object.assign(new Error("Student profile not found."), { statusCode: 404 });
  return student;
};

// ── GET /api/student/dashboard ────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);

    // Latest fee
    const latestFee = await Fee.findOne({
      where: { student_id: student.id },
      order: [["due_date", "DESC"]],
    });

    // Open complaints count
    const openComplaints = await Complaint.count({
      where: { student_id: student.id, status: { [Op.ne]: "resolved" } },
    });

    // Pending gate passes count
    const pendingPasses = await GatePass.count({
      where: { student_id: student.id, status: "pending" },
    });

    // Attendance this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalDays = now.getDate();
    const presentDays = await Attendance.count({
      where: {
        student_id: student.id,
        date: { [Op.gte]: firstDay },
        status: { [Op.in]: ["present", "late"] },
      },
    });

    // Latest notices
    const notices = await Notice.findAll({
      where: { 
        is_active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { target_block: student.room ? student.room.block : null },
              { target_block: null }
            ]
          },
          {
            [Op.or]: [
              { expires_at: { [Op.gt]: new Date() } },
              { expires_at: null }
            ]
          }
        ]
      },
      order: [["created_at", "DESC"]],
      limit: 5,
      include: [{ model: User, as: "creator", attributes: ["name", "role"] }],
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          roll_no: student.roll_no,
          course: student.course,
          year: student.year,
          contact: student.contact,
          email: student.email,
          profile_pic: student.profile_pic,
          join_date: student.join_date,
        },
        room: student.room || null,
        fee_status: latestFee
          ? {
              total: latestFee.total_amount,
              paid: latestFee.paid_amount,
              status: latestFee.status,
              due_date: latestFee.due_date,
              month: latestFee.month,
            }
          : null,
        stats: {
          open_complaints: openComplaints,
          pending_gate_passes: pendingPasses,
          attendance_percentage:
            totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
        },
        notices,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/notices ──────────────────────────────────────────────────
exports.getNotices = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const notices = await Notice.findAll({
      where: { 
        is_active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { target_role: "all" },
              { target_role: "student" }
            ]
          },
          {
            [Op.or]: [
              { target_block: student.room ? student.room.block : null },
              { target_block: null }
            ]
          },
          {
            [Op.or]: [
              { expires_at: { [Op.gt]: new Date() } },
              { expires_at: null }
            ]
          }
        ]
      },
      order: [["pinned", "DESC"], ["created_at", "DESC"]],
      include: [{ model: User, as: "creator", attributes: ["name"] }],
    });
    res.json({ success: true, data: notices });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/notifications ────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    // You must add Notification to the required destructured models at the top of the file
    // Require Notification locally or add to top
    const notifications = await Notification.findAll({
      where: { student_id: student.id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/room ─────────────────────────────────────────────────────
exports.getRoom = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student.room_id) {
      return res.json({ success: true, data: null, message: "No room assigned yet." });
    }

    const room = await Room.findByPk(student.room_id, {
      include: [
        {
          model: Student,
          as: "students",
          attributes: ["id", "name", "roll_no", "course"],
          where: { is_active: true },
          required: false,
        },
      ],
    });

    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/fees ─────────────────────────────────────────────────────
exports.getFees = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const fees = await Fee.findAll({
      where: { student_id: student.id },
      order: [["due_date", "DESC"]],
    });

    const fines = await Fine.findAll({
      where: { student_id: student.id },
      order: [["createdAt", "DESC"]],
      include: [{ model: User, as: "issuedByUser", attributes: ["name"] }],
    });

    // Also fetch fee reminders (notifications)
    const reminders = await Notification.findAll({
      where: { 
        student_id: student.id,
        type: "fee_reminder"
      },
      order: [["createdAt", "DESC"]]
    });

    const totalDue = fees.reduce(
      (sum, f) => sum + (parseFloat(f.total_amount) - parseFloat(f.paid_amount)),
      0
    );

    const totalFinesDue = fines
      .filter((f) => f.status === "unpaid")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    res.json({ success: true, data: { fees, fines, reminders, totalDue, totalFinesDue } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/student/complaint ───────────────────────────────────────────────
exports.raiseComplaint = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    let { category, subject, description, priority } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, message: "category, subject, and description are required." });
    }

    // Map variations to canonical categories if needed
    if (category === "room_cleaning" || category === "cleaning" || category === "Housekeeping") {
      // We can keep 'Housekeeping' as the primary one now that it's in ENUM
      if (category !== "Housekeeping") category = "Housekeeping";
    }

    const complaint = await Complaint.create({
      student_id: student.id,
      category,
      subject,
      description,
      priority: priority || "medium",
      attachment: req.file ? `/uploads/${req.file.filename}` : null,
      block: student.room ? student.room.block : null,
    });

    // Emit real-time event to admin(s) and warden
    const io = req.app.get("io");
    io.to("admin_room").emit("newComplaint", {
      complaint_id: complaint.id,
      student_name: student.name,
      roll_no: student.roll_no,
      category,
      subject,
      priority: complaint.priority,
      created_at: complaint.createdAt,
    });

    // Also notify warden room if it's a housekeeping complaint
    if (category === "Housekeeping") {
      const wardenRoom = student.room ? `warden_${student.room.block}` : "warden_room";
      io.to(wardenRoom).to("warden_room").emit("newCleaningComplaint", {
        complaint_id: complaint.id,
        student_name: student.name,
        subject,
        category,
        room: student.room ? `${student.room.block}-${student.room.room_number}` : 'N/A'
      });
    }

    res.status(201).json({ success: true, message: "Complaint raised successfully.", data: complaint });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/complaints ───────────────────────────────────────────────
exports.getComplaints = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const complaints = await Complaint.findAll({
      where: { student_id: student.id },
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/student/gatepass ────────────────────────────────────────────────
exports.requestGatePass = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const { destination, reason, departure_time, return_time, pass_type } = req.body;

    if (!destination || !reason || !departure_time || !return_time) {
      return res.status(400).json({ success: false, message: "All gate pass fields are required." });
    }

    const dTime = new Date(departure_time);
    const rTime = new Date(return_time);
    
    // Allow a 10-minute grace period to prevent false-positives when users select the current minute
    const bufferTime = new Date(Date.now() - 10 * 60000);

    if (dTime < bufferTime) {
      return res.status(400).json({ success: false, message: "Departure time cannot be in the past." });
    }
    if (rTime <= dTime) {
      return res.status(400).json({ success: false, message: "Return time must be after departure time." });
    }

    const gatePass = await GatePass.create({
      student_id: student.id,
      destination,
      reason,
      departure_time: new Date(departure_time),
      return_time: new Date(return_time),
      pass_type: pass_type || "day",
      status: "pending",
    });

    // Notify warden(s) in real-time
    const io = req.app.get("io");
    const wardenRoom = student.room ? `warden_${student.room.block}` : "warden_room";
    io.to(wardenRoom).to("warden_room").emit("newGatePassRequest", {
      gate_pass_id: gatePass.id,
      student_name: student.name,
      roll_no: student.roll_no,
      destination,
      departure_time,
      return_time,
      pass_type: gatePass.pass_type,
      created_at: gatePass.created_at,
    });

    res.status(201).json({ success: true, message: "Gate pass request submitted.", data: gatePass });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/gatepasses ───────────────────────────────────────────────
exports.getGatePasses = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const passes = await GatePass.findAll({
      where: { 
        student_id: student.id,
        status: { [Op.ne]: "expired" }
      },
      order: [["created_at", "DESC"]],
      include: [{ model: User, as: "approvedByUser", attributes: ["name"] }],
    });
    res.json({ success: true, data: passes });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/student/upload-photo ────────────────────────────────────────────
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const filePath = `/uploads/${req.file.filename}`;

    // Update both student and user records
    const student = await getStudentByUserId(req.user.id);
    await Student.update({ profile_pic: filePath }, { where: { id: student.id } });
    await User.update({ profile_pic: filePath }, { where: { id: req.user.id } });

    res.json({ success: true, message: "Profile photo updated.", profile_pic: filePath });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/attendance ───────────────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const { month, year } = req.query;

    let where = { student_id: student.id };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      where.date = { [Op.between]: [start, end] };
    }

    const attendance = await Attendance.findAll({ where, order: [["date", "DESC"]] });
    const present = attendance.filter((a) => ["present", "late"].includes(a.status)).length;
    const absent = attendance.filter((a) => a.status === "absent").length;

    res.json({
      success: true,
      data: attendance,
      summary: { total: attendance.length, present, absent, percentage: attendance.length ? Math.round((present / attendance.length) * 100) : 0 },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/student/idcard ───────────────────────────────────────────────────
exports.getIdCard = async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    res.json({
      success: true,
      data: {
        name: student.name,
        roll_no: student.roll_no,
        course: student.course,
        year: student.year,
        room: student.room ? `${student.room.block}-${student.room.room_number}` : "Not Assigned",
        contact: student.contact,
        profile_pic: student.profile_pic,
        join_date: student.join_date,
        hostel: "HOSTILERZ",
      },
    });
  } catch (err) {
    next(err);
  }
};
