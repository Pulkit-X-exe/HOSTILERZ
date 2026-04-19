// controllers/wardenController.js
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const { Student, Room, GatePass, Attendance, Visitor, User, Fee, Fine, Notice, Complaint } = require("../models");
const { sequelize } = require("../config/database");

// ── Helper: get block of the logged-in warden ─────────────────────────────────
const getWardenBlock = (req) => req.user.block;

// ── GET /api/warden/overview ──────────────────────────────────────────────────
exports.getOverview = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);

    // All rooms in this warden's block
    const rooms = await Room.findAll({
      where: { block },
      include: [
        {
          model: Student,
          as: "students",
          where: { is_active: true },
          required: false,
          attributes: ["id", "name", "roll_no", "contact"],
        },
      ],
      order: [["room_number", "ASC"]],
    });

    const studentIds = rooms.flatMap((r) => r.students.map((s) => s.id));

    // Today's attendance summary for this block
    const today = new Date().toISOString().slice(0, 10);
    const attendanceToday = await Attendance.findAll({
      where: { student_id: { [Op.in]: studentIds }, date: today },
    });

    const presentCount = attendanceToday.filter((a) => ["present", "late"].includes(a.status)).length;
    const absentCount = attendanceToday.filter((a) => a.status === "absent").length;

    // Pending gate passes for this block
    const pendingPasses = await GatePass.count({
      where: {
        status: "pending",
        student_id: { [Op.in]: studentIds },
      },
    });

    // Visitors currently inside
    const activeVisitors = await Visitor.count({
      where: {
        student_id: { [Op.in]: studentIds },
        check_out: null,
      },
    });

    // Active complaints for this block
    const activeComplaints = await Complaint.count({
      where: {
        block,
        status: { [Op.in]: ["pending", "in_progress"] },
      },
    });

    res.json({
      success: true,
      data: {
        block,
        rooms,
        stats: {
          total_students: studentIds.length,
          total_rooms: rooms.length,
          occupied_rooms: rooms.filter((r) => r.current_occupancy > 0).length,
          present_today: presentCount,
          absent_today: absentCount,
          attendance_marked: attendanceToday.length,
          pending_gate_passes: pendingPasses,
          active_visitors: activeVisitors,
          active_complaints: activeComplaints,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/gatepasses ────────────────────────────────────────────────
exports.getGatePasses = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const { status = "pending", page = 1, limit = 50 } = req.query;

    const where = {};
    if (status !== "all") {
      where.status = status;
    } else {
      where.status = { [require("sequelize").Op.ne]: "expired" };
    }

    const { count, rows } = await GatePass.findAndCountAll({
      where,
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["name", "roll_no", "contact", "room_id"],
          required: true, // Crucial for inner join style filtering
          include: [{ 
            model: Room, 
            as: "room", 
            attributes: ["room_number", "block"],
            where: { block } // Strict isolation here
          }],
        },
        { model: User, as: "approvedByUser", attributes: ["name"] },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/gatepass/approve ─────────────────────────────────────────
exports.approveGatePass = async (req, res, next) => {
  try {
    const { gate_pass_id, remarks } = req.body;
    if (!gate_pass_id) {
      return res.status(400).json({ success: false, message: "gate_pass_id is required." });
    }

    const pass = await GatePass.findByPk(gate_pass_id, {
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["name", "roll_no", "email", "room_id", "user_id"],
          include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }]
        }
      ],
    });
    if (!pass) return res.status(404).json({ success: false, message: "Gate pass not found." });

    // Block Isolation Check
    const block = getWardenBlock(req);
    if (pass.student?.room?.block !== block) {
      return res.status(403).json({ success: false, message: "Unauthorized. This student is in a different block." });
    }

    if (pass.status !== "pending") {
      return res.status(400).json({ success: false, message: `Gate pass is already ${pass.status}.` });
    }

    await pass.update({
      status: "approved",
      approved_by: req.user.id,
      approved_at: new Date(),
      warden_remarks: remarks || "Approved",
    });
    
    console.log("GatePass Data:", pass.toJSON());
    console.log("Sending mail to: krmusecurity@gmail.com");

    // Send email with Nodemailer
    console.log("MAIL FUNCTION TRIGGERED");
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: "krmusecurity@gmail.com",
          subject: "Gate Pass Approved",
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
              <div style="text-align: center; margin-bottom: 25px;">
                <img src="https://placehold.co/200x60/4CAF50/FFFFFF.png?text=HOSTILERZ&font=montserrat" alt="HOSTILERZ Logo" style="width: 160px; height: auto; margin-bottom: 15px; border-radius: 4px;" />
                <h2 style="color: #4CAF50; margin: 0; font-size: 24px;">Gate Pass Approved ✅</h2>
              </div>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
              <p style="margin: 8px 0; line-height: 1.5;"><strong>Student Name:</strong> ${pass.student?.name || "N/A"}</p>
              <p style="margin: 8px 0; line-height: 1.5;"><strong>Roll Number:</strong> ${pass.student?.roll_no || "N/A"}</p>
              <p style="margin: 8px 0; line-height: 1.5;"><strong>Destination:</strong> ${pass?.destination || "N/A"}</p>
              <p style="margin: 8px 0; line-height: 1.5;"><strong>Departure:</strong> ${pass?.departure_time ? new Date(pass.departure_time).toLocaleString() : "N/A"}</p>
              <p style="margin: 8px 0; line-height: 1.5;"><strong>Return:</strong> ${pass?.return_time ? new Date(pass.return_time).toLocaleString() : "N/A"}</p>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin-top: 25px; border-radius: 0 4px 4px 0;">
                <p style="color: #2e7d32; font-weight: 500; margin: 0; font-size: 14px;">
                  Your request of gate pass is approved.
                </p>
              </div>
            </div>
          `
        };

        console.log("Sending approval email...");
        transporter.sendMail(mailOptions).then((info) => {
          console.log("Email sent:", info.response);
        }).catch((err) => {
          console.error("Email error:", err);
        });
      }
    } catch (mailErr) {
      console.error("Mail Error:", mailErr);
    }

    // Notify the student in real-time
    const io = req.app.get("io");
    io.to(`student_${pass.student.user_id}`).emit("gatePassApproved", {
      gate_pass_id: pass.id,
      status: "approved",
      approved_by: req.user.name,
      warden_remarks: remarks || "Approved",
    });

    // Notify admin
    io.to("admin_room").emit("dataUpdated", { type: "gatepass_approved", pass_id: pass.id });

    res.json({
      success: true,
      message: "Gate pass approved.",
      data: { pass_id: pass.id },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/gatepass/reject ──────────────────────────────────────────
exports.rejectGatePass = async (req, res, next) => {
  try {
    const { gate_pass_id, remarks } = req.body;
    if (!gate_pass_id) {
      return res.status(400).json({ success: false, message: "gate_pass_id is required." });
    }

    const pass = await GatePass.findByPk(gate_pass_id, {
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["name", "roll_no", "user_id"],
          include: [{ model: Room, as: "room", attributes: ["block"] }]
        }
      ]
    });
    if (!pass) return res.status(404).json({ success: false, message: "Gate pass not found." });

    // Block Isolation Check
    const block = getWardenBlock(req);
    if (pass.student?.room?.block !== block) {
      return res.status(403).json({ success: false, message: "Unauthorized. This student is in a different block." });
    }

    if (pass.status !== "pending") {
      return res.status(400).json({ success: false, message: `Gate pass is already ${pass.status}.` });
    }

    await pass.update({
      status: "rejected",
      approved_by: req.user.id,
      approved_at: new Date(),
      warden_remarks: remarks || "Rejected by warden.",
    });

    // Notify student
    req.app.get("io").to(`student_${pass.student.user_id}`).emit("gatePassRejected", {
      gate_pass_id: pass.id,
      status: "rejected",
      warden_remarks: remarks || "Rejected by warden.",
    });

    res.json({ success: true, message: "Gate pass rejected.", data: pass });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/attendance ───────────────────────────────────────────────
exports.markAttendance = async (req, res, next) => {
  try {
    const { date, records } = req.body;
    // records: [{ student_id, status, remarks, check_in_time }]
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "date and records[] are required." });
    }

    const block = getWardenBlock(req);

    // Verify all students belong to warden's block
    const studentIds = records.map((r) => r.student_id);
    const validStudents = await Student.findAll({
      where: { id: { [Op.in]: studentIds }, is_active: true },
      include: [{ model: Room, as: "room", where: { block }, attributes: ["id"] }],
    });
    const validIds = new Set(validStudents.map((s) => s.id));

    const attendanceData = records
      .filter((r) => validIds.has(r.student_id))
      .map((r) => ({
        student_id: r.student_id,
        date,
        status: r.status,
        marked_by: req.user.id,
        remarks: r.remarks || null,
        check_in_time: r.check_in_time || null,
      }));

    // Upsert: update if exists for that date, insert otherwise
    await Attendance.bulkCreate(attendanceData, {
      updateOnDuplicate: ["status", "marked_by", "remarks", "check_in_time"],
    });

    // Notify admin in real-time
    req.app.get("io").to("admin_room").emit("dataUpdated", {
      type: "attendance_marked",
      block,
      date,
      count: attendanceData.length,
    });

    res.json({
      success: true,
      message: `Attendance marked for ${attendanceData.length} students on ${date}.`,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/attendance ────────────────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const rooms = await Room.findAll({ where: { block }, attributes: ["id"] });
    const roomIds = rooms.map((r) => r.id);

    const students = await Student.findAll({
      where: { room_id: { [Op.in]: roomIds }, is_active: true },
      attributes: ["id", "name", "roll_no"],
      include: [
        {
          model: Attendance,
          as: "attendance",
          where: { date: targetDate },
          required: false,
        },
      ],
    });

    res.json({ success: true, data: students, date: targetDate });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/visitor ──────────────────────────────────────────────────
exports.addVisitor = async (req, res, next) => {
  try {
    const { student_id, visitor_name, relation, contact, purpose, id_proof_type } = req.body;
    if (!student_id || !visitor_name || !relation || !contact) {
      return res.status(400).json({ success: false, message: "student_id, visitor_name, relation, contact required." });
    }

    const visitor = await Visitor.create({
      student_id,
      visitor_name,
      relation,
      contact,
      purpose,
      id_proof_type,
      approved_by: req.user.id,
    });

    req.app.get("io").to("admin_room").emit("dataUpdated", { type: "visitor_added" });
    res.status(201).json({ success: true, message: "Visitor checked in.", data: visitor });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/warden/visitor/:id/checkout ──────────────────────────────────────
exports.checkoutVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findByPk(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: "Visitor record not found." });
    if (visitor.check_out) return res.status(400).json({ success: false, message: "Visitor already checked out." });

    await visitor.update({ check_out: new Date() });
    res.json({ success: true, message: "Visitor checked out.", data: visitor });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/visitors ──────────────────────────────────────────────────
exports.getVisitors = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const { active_only } = req.query;

    const rooms = await Room.findAll({ where: { block }, attributes: ["id"] });
    const roomIds = rooms.map((r) => r.id);
    const students = await Student.findAll({
      where: { room_id: { [Op.in]: roomIds }, is_active: true },
      attributes: ["id"],
    });
    const studentIds = students.map((s) => s.id);

    let where = { student_id: { [Op.in]: studentIds } };
    if (active_only === "true") where.check_out = null;

    const visitors = await Visitor.findAll({
      where,
      include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
      order: [["check_in", "DESC"]],
    });

    res.json({ success: true, data: visitors });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/students ──────────────────────────────────────────────────
exports.getBlockStudents = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const rooms = await Room.findAll({ where: { block }, attributes: ["id"] });
    const roomIds = rooms.map((r) => r.id);

    const students = await Student.findAll({
      where: { room_id: { [Op.in]: roomIds }, is_active: true },
      include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }],
      order: [["name", "ASC"]],
    });

    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/fine ─────────────────────────────────────────────────────
exports.issueFine = async (req, res, next) => {
  try {
    const { roll_no, amount, reason } = req.body;
    if (!roll_no || !amount || !reason) {
      return res.status(400).json({ success: false, message: "roll_no, amount, and reason are required." });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0." });
    }

    // Find student by roll_no
    const student = await Student.findOne({ where: { roll_no: roll_no.trim() } });
    if (!student) {
      return res.status(404).json({ success: false, message: `No student found with roll number ${roll_no}.` });
    }

    const fine = await Fine.create({
      student_id: student.id,
      roll_no: student.roll_no,
      amount: parseFloat(amount),
      reason,
      status: "unpaid",
      issued_by: req.user.id,
    });

    // Notify the student in real-time
    const io = req.app.get("io");
    io.to(`student_${student.user_id}`).emit("fineIssued", {
      fine_id: fine.id,
      amount: fine.amount,
      reason: fine.reason,
      issued_by: req.user.name,
    });

    res.status(201).json({
      success: true,
      message: `Fine of ₹${amount} issued to ${student.name} (${student.roll_no}).`,
      data: fine,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/fines ─────────────────────────────────────────────────────
exports.getFines = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const rooms = await Room.findAll({ where: { block }, attributes: ["id"] });
    const roomIds = rooms.map((r) => r.id);
    const students = await Student.findAll({
      where: { room_id: { [Op.in]: roomIds }, is_active: true },
      attributes: ["id"],
    });
    const studentIds = students.map((s) => s.id);

    const fines = await Fine.findAll({
      where: { student_id: { [Op.in]: studentIds } },
      include: [
        { model: Student, as: "student", attributes: ["name", "roll_no"] },
        { model: User, as: "issuedByUser", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: fines });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/warden/fine/:id/pay ──────────────────────────────────────────────
exports.markFinePaid = async (req, res, next) => {
  try {
    const fine = await Fine.findByPk(req.params.id, {
      include: [{ model: Student, as: "student", attributes: ["id", "name", "roll_no", "user_id"] }],
    });
    if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });
    if (fine.status === "paid") {
      return res.status(400).json({ success: false, message: "Fine is already marked as paid." });
    }

    await fine.update({ status: "paid", paid_at: new Date() });

    // Notify student
    const io = req.app.get("io");
    if (fine.student) {
      io.to(`student_${fine.student.user_id}`).emit("fineUpdated", {
        fine_id: fine.id,
        status: "paid",
      });
    }

    res.json({ success: true, message: "Fine marked as paid.", data: fine });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/warden/notice ───────────────────────────────────────────────────
exports.postNotice = async (req, res, next) => {
  try {
    const { title, message, duration } = req.body;
    if (!title || !message || !duration) {
      return res.status(400).json({ success: false, message: "title, message, and duration are required." });
    }

    const durationHours = parseInt(duration);
    if (![24, 168].includes(durationHours)) {
      return res.status(400).json({ success: false, message: "Duration must be 24 (hours) or 168 (7 days)." });
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const notice = await Notice.create({
      title,
      message,
      created_by: req.user.id,
      target_role: "all",
      target_block: req.user.block, // Automatically set based on warden's block
      is_active: true,
      expires_at: expiresAt,
    });

    // Broadcast to all connected users
    const io = req.app.get("io");
    io.emit("newNotice", { notice_id: notice.id, title: notice.title });

    res.status(201).json({
      success: true,
      message: "Notice posted successfully.",
      data: notice,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/notices ───────────────────────────────────────────────────
exports.getNotices = async (req, res, next) => {
  try {
    const notices = await Notice.findAll({
      where: {
        is_active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { target_block: req.user.block },
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
      include: [{ model: User, as: "creator", attributes: ["name", "role"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: notices });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/complaints ────────────────────────────────────────────────
exports.getComplaints = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const { type } = req.query; // type=cleaning | type=general | (omit = all)

    let where = { block };
    if (type === "cleaning") {
      where.category = { [Op.in]: ["Housekeeping", "cleaning"] };
    } else if (type === "general") {
      where.category = { [Op.notIn]: ["Housekeeping", "cleaning"] };
    }

    const complaints = await Complaint.findAll({
      where,
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["name", "roll_no"],
          include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/warden/complaint/:id ─────────────────────────────────────────────
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [{ model: Student, as: "student", attributes: ["id", "name", "user_id"] }],
    });
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found." });

    const { status } = req.body;
    const validStatuses = ["pending", "in_progress", "resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be pending, in_progress, or resolved." });
    }

    const updates = { status };
    if (status === "resolved") updates.resolved_at = new Date();
    await complaint.update(updates);

    // Notify student in real-time
    const io = req.app.get("io");
    if (complaint.student) {
      io.to(`student_${complaint.student.user_id}`).emit("complaintUpdated", {
        complaint_id: complaint.id,
        status: complaint.status,
      });
    }

    res.json({ success: true, message: "Complaint status updated.", data: complaint });
  } catch (err) {
    next(err);
  }
};
// ── PUT /api/warden/room/:id/status ──────────────────────────────────────────
exports.updateRoomStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    const block = getWardenBlock(req);

    if (!["available", "maintenance"].includes(status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Status must be available or maintenance." });
    }

    const room = await Room.findOne({ 
      where: { id: req.params.id, block },
      include: [{ model: Student, as: "students", where: { is_active: true }, required: false }]
    });

    if (!room) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Room not found in your block." });
    }

    // If setting to available (Empty), remove students as requested
    if (status === "available") {
      if (room.students && room.students.length > 0) {
        const studentIds = room.students.map(s => s.id);
        await Student.update({ room_id: null, room_no: null }, { 
          where: { id: { [Op.in]: studentIds } },
          transaction: t 
        });
        
        // Emit event for real-time removal
        req.app.get("io").emit("dataUpdated", { type: "room_cleared", room_id: room.id, student_ids: studentIds });
      }
      await room.update({ status: "available", current_occupancy: 0 }, { transaction: t });
    } else {
      // maintenance - students can stay, or we can leave it to the user.
      // User said "put the room on maintanence occupied and empty".
      // Usually maintenance means no one should be there. 
      // But for now, we just update status.
      await room.update({ status: "maintenance" }, { transaction: t });
    }

    await t.commit();
    req.app.get("io").emit("dataUpdated", { type: "room_status_updated", room_id: room.id, status });
    res.json({ success: true, message: `Room status updated to ${status}.`, data: room });
  } catch (err) {
    if (t) await t.rollback();
    next(err);
  }
};
// ── GET /api/warden/students ──────────────────────────────────────────────
exports.getBlockStudents = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    // Find rooms in this block first
    const rooms = await Room.findAll({ where: { block }, attributes: ["id"] });
    const roomIds = rooms.map(r => r.id);

    const students = await Student.findAll({
      where: {
        room_id: { [Op.in]: roomIds },
        is_active: true
      },
      include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }],
      attributes: ["id", "name", "roll_no", "contact", "room_no"],
      order: [["name", "ASC"]]
    });

    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/warden/rooms ───────────────────────────────────────────────────
exports.getBlockRooms = async (req, res, next) => {
  try {
    const block = getWardenBlock(req);
    const rooms = await Room.findAll({
      where: { block },
      include: [
        {
          model: Student,
          as: "students",
          where: { is_active: true },
          required: false,
          attributes: ["id", "name", "roll_no", "contact"],
        },
      ],
      order: [["room_number", "ASC"]],
    });

    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};
