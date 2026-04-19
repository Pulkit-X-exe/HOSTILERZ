// controllers/adminController.js
const bcrypt = require("bcryptjs");
const { Op, fn, col, literal } = require("sequelize");
const { sequelize } = require("../config/database");
const { User, Student, Room, Fee, Fine, Complaint, Notice, GatePass, Attendance, Notification } = require("../models");

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalRooms,
      availableRooms,
      pendingComplaints,
      pendingGatePasses,
      totalFines,
      recentComplaints,
      recentGatePasses,
      blockAOccupancy,
      blockBOccupancy,
    ] = await Promise.all([
      Student.count({ where: { is_active: true } }),
      Room.count(),
      Room.count({ where: { status: "available" } }),
      Complaint.count({ where: { status: { [Op.in]: ["pending", "in_progress"] } } }),
      GatePass.count({ where: { status: "pending" } }),
      Fine.count(),
      Complaint.findAll({
        order: [["created_at", "DESC"]],
        limit: 5,
        include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
      }),
      GatePass.findAll({
        order: [["created_at", "DESC"]],
        limit: 5,
        include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
      }),
      Room.sum("current_occupancy", { where: { block: "A" } }),
      Room.sum("current_occupancy", { where: { block: "B" } }),
    ]);

    const blockATotal = await Room.sum("capacity", { where: { block: "A" } });
    const blockBTotal = await Room.sum("capacity", { where: { block: "B" } });

    res.json({
      success: true,
      data: {
        stats: {
          total_students: totalStudents,
          total_rooms: totalRooms,
          available_rooms: availableRooms,
          occupied_rooms: totalRooms - availableRooms,
          pending_complaints: pendingComplaints,
          pending_gate_passes: pendingGatePasses,
          total_fines: totalFines,
        },
        recent_complaints: recentComplaints,
        recent_gate_passes: recentGatePasses,
        room_overview: {
          total_rooms: totalRooms,
          occupied_rooms: totalRooms - availableRooms,
          blocks: [
            { name: "Block A", occupied: blockAOccupancy || 0, total: blockATotal || 0 },
            { name: "Block B", occupied: blockBOccupancy || 0, total: blockBTotal || 0 },
          ],
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/students ───────────────────────────────────────────────────
exports.getStudents = async (req, res, next) => {
  try {
    const { search, room_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = { is_active: true };
    if (room_id) where.room_id = room_id;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { roll_no: { [Op.like]: `%${search}%` } },
        { course: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Student.findAndCountAll({
      where,
      include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }],
      order: [["name", "ASC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/student ───────────────────────────────────────────────────
exports.createStudent = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    console.log("Creating student with payload:", req.body);
    const { name, roll_no, course, year, contact, email, gender, room_id, guardian_name, guardian_contact, address } = req.body;
    let { password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      if (t) await t.rollback();
      return res.status(400).json({ success: false, message: "Valid name (min 3 chars) is required." });
    }

    if (!roll_no || !course || !contact) {
      if (t) await t.rollback();
      return res.status(400).json({ success: false, message: "Roll number, course, and contact are required." });
    }

    if (!password) {
      password = "password123";
    }

    // Check duplicate roll_no
    const exists = await User.findOne({ where: { roll_no } });
    if (exists) {
      if (t) await t.rollback();
      return res.status(409).json({ success: false, message: "Roll number already exists." });
    }

    // Create user account
    const user = await User.create({ name, role: "student", roll_no, password }, { transaction: t });
    console.log(`User created with ID: ${user.id}`);

    // Fetch room string if room_id is provided
    let room_no = null;
    if (room_id) {
      const room = await Room.findByPk(room_id, { transaction: t });
      if (room) {
        // Gender Block Validation
        if (gender === 'male' && room.block !== 'A') {
          if (t) await t.rollback();
          return res.status(400).json({ success: false, message: "Boys can only be assigned to Block A." });
        }
        if (gender === 'female' && room.block !== 'B') {
          if (t) await t.rollback();
          return res.status(400).json({ success: false, message: "Girls can only be assigned to Block B." });
        }
        room_no = `${room.block}-${room.room_number}`;
      }
    }

    // Create student profile
    const student = await Student.create(
      { 
        user_id: user.id, 
        name, 
        roll_no, 
        course, 
        gender: gender || 'male',
        year: year || 1, 
        contact, 
        email, 
        room_id: room_id || null, 
        room_no, 
        guardian_name, 
        guardian_contact, 
        address 
      },
      { transaction: t }
    );
    console.log(`Student profile created with ID: ${student.id}`);

    // If room assigned, update room occupancy
    if (room_id) {
      await Room.increment("current_occupancy", { where: { id: room_id }, transaction: t });
      await Room.update(
        { status: literal(`CASE WHEN current_occupancy >= capacity THEN 'occupied' ELSE 'available' END`) },
        { where: { id: room_id }, transaction: t }
      );
    }

    await t.commit();
    console.log("Transaction committed successfully.");

    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("dataUpdated", { type: "student_added", student_id: student.id });
    }

    res.status(201).json({ 
      success: true, 
      message: "Student added successfully.", 
      student: student 
    });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Create Student Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to create student due to internal error." 
    });
  }
};

// ── PUT /api/admin/student/:id ────────────────────────────────────────────────
exports.updateStudent = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const { name, course, year, contact, email, gender, room_id, guardian_name, guardian_contact, address } = req.body;

    let room_no = undefined;
    if (room_id !== undefined && room_id !== student.room_id) {
      if (student.room_id) {
        await Room.decrement("current_occupancy", { where: { id: student.room_id }, transaction: t });
        await Room.update({ status: "available" }, { where: { id: student.room_id }, transaction: t });
      }
      if (room_id) {
        const room = await Room.findByPk(room_id, { transaction: t });
        if (room) {
          // Gender Block Validation
          const currentGender = gender || student.gender;
          if (currentGender === 'male' && room.block !== 'A') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Boys can only be assigned to Block A." });
          }
          if (currentGender === 'female' && room.block !== 'B') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Girls can only be assigned to Block B." });
          }
          room_no = `${room.block}-${room.room_number}`;
        }
        await Room.increment("current_occupancy", { where: { id: room_id }, transaction: t });
        await Room.update(
          { status: literal(`CASE WHEN current_occupancy >= capacity THEN 'occupied' ELSE 'available' END`) },
          { where: { id: room_id }, transaction: t }
        );
      } else {
        room_no = null;
      }
    }

    const updateData = { name, course, year, contact, email, room_id, room_no, guardian_name, guardian_contact, address };
    if (gender) updateData.gender = gender;
    await student.update(updateData, { transaction: t });
    if (name) await User.update({ name }, { where: { id: student.user_id }, transaction: t });

    await t.commit();
    req.app.get("io").emit("dataUpdated", { type: "student_updated", student_id: id });
    res.json({ success: true, message: "Student updated.", data: student });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── DELETE /api/admin/student/:id ─────────────────────────────────────────────
exports.deleteStudent = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    // Soft-delete: deactivate instead of hard delete
    await student.update({ is_active: false }, { transaction: t });
    await User.update({ is_active: false }, { where: { id: student.user_id }, transaction: t });

    if (student.room_id) {
      await Room.decrement("current_occupancy", { where: { id: student.room_id }, transaction: t });
      await Room.update({ status: "available" }, { where: { id: student.room_id }, transaction: t });
    }

    await t.commit();
    req.app.get("io").emit("dataUpdated", { type: "student_removed", student_id: req.params.id });
    res.json({ success: true, message: "Student deactivated." });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── GET /api/admin/complaints ─────────────────────────────────────────────────
exports.getComplaints = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    let where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const { count, rows } = await Complaint.findAndCountAll({
      where,
      include: [{ model: Student, as: "student", attributes: ["name", "roll_no", "room_id"], include: [{ model: Room, as: "room", attributes: ["room_number", "block"] }] }],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page) } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admin/complaint/:id ──────────────────────────────────────────────
exports.updateComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
    });
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found." });

    const { status, admin_remarks, priority } = req.body;
    const updates = { status, priority, admin_remarks };
    if (status === "resolved") updates.resolved_at = new Date();

    await complaint.update(updates);

    // Notify the specific student in real-time
    const io = req.app.get("io");
    if (complaint.student) {
      io.to(`student_${complaint.student.user_id}`).emit("complaintUpdated", {
        complaint_id: complaint.id,
        status: complaint.status,
        admin_remarks: complaint.admin_remarks,
      });
    }
    io.to("admin_room").emit("dataUpdated", { type: "complaint_updated" });

    res.json({ success: true, message: "Complaint status updated.", data: complaint });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/fees ───────────────────────────────────────────────────────
exports.getFees = async (req, res, next) => {
  try {
    const { status } = req.query;
    let where = {};
    if (status) where.status = status;

    const fees = await Fee.findAll({
      where,
      include: [{ model: Student, as: "student", attributes: ["name", "roll_no", "contact"] }],
      order: [["due_date", "ASC"]],
    });

    res.json({ success: true, data: fees });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admin/fee/:id ────────────────────────────────────────────────────
exports.updateFee = async (req, res, next) => {
  try {
    const fee = await Fee.findByPk(req.params.id);
    if (!fee) return res.status(404).json({ success: false, message: "Fee record not found." });

    const { paid_amount, payment_method, transaction_id, status } = req.body;
    const updates = { paid_amount, payment_method, transaction_id };

    if (paid_amount >= fee.total_amount) {
      updates.status = "paid";
      updates.payment_date = new Date();
    } else if (paid_amount > 0) {
      updates.status = "partial";
    }
    if (status) updates.status = status;

    await fee.update(updates);

    // Notify student (if student profile exists)
    const student = await Student.findByPk(fee.student_id);
    if (student) {
      req.app.get("io").to(`student_${student.user_id}`).emit("feeUpdated", {
        fee_id: fee.id,
        status: fee.status,
        paid_amount: fee.paid_amount,
      });
    }

    res.json({ success: true, message: "Fee updated.", data: fee });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/fee-reminder ──────────────────────────────────────────────
exports.sendFeeReminder = async (req, res, next) => {
  try {
    const { fee_id } = req.body;
    if (!fee_id || isNaN(Number(fee_id))) return res.status(400).json({ success: false, message: "A valid numeric fee_id is required." });

    const fee = await Fee.findByPk(fee_id, {
      include: [{ model: Student, as: "student" }],
    });

    if (!fee) return res.status(404).json({ success: false, message: "Fee record not found." });

    // Store in DB
    const notification = await Notification.create({
      student_id: fee.student_id,
      fee_id: fee.id,
      title: "Fee Payment Reminder",
      message: `Gentle reminder: Your fee for ${fee.month} (Due: ${new Date(fee.due_date).toLocaleDateString()}) is still pending. Please pay to avoid late fees.`,
      type: "fee_reminder",
      status: "pending"
    });

    // Real-time emit to student
    req.app.get("io").to(`student_${fee.student.user_id}`).emit("feeReminder", {
      notification_id: notification.id,
      fee_id: fee.id,
      title: notification.title,
      message: notification.message,
      status: "pending",
      created_at: notification.createdAt,
    });

    res.json({ success: true, message: "Fee reminder sent." });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/fee-reminder/roll-no ───────────────────────────────────────
exports.sendFeeReminderByRollNo = async (req, res, next) => {
  try {
    const { roll_no } = req.body;
    if (!roll_no) return res.status(400).json({ success: false, message: "roll_no is required." });

    const student = await Student.findOne({ where: { roll_no, is_active: true } });
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });

    // Store in DB (Decoupled from specific fee_id)
    const notification = await Notification.create({
      student_id: student.id,
      title: "Fee Payment Reminder",
      message: `Gentle reminder: Please ensure all your pending hostel fees and fines are paid to avoid any late charges or restrictions.`,
      type: "fee_reminder",
      status: "pending"
    });

    // Real-time emit to student
    req.app.get("io").to(`student_${student.user_id}`).emit("feeReminder", {
      notification_id: notification.id,
      title: notification.title,
      message: notification.message,
      status: "pending",
      created_at: notification.createdAt,
    });

    res.json({ success: true, message: `Fee reminder sent to ${student.name} (Roll: ${roll_no})` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/rooms ──────────────────────────────────────────────────────
exports.getRooms = async (req, res, next) => {
  try {
    const { block, status } = req.query;
    let where = {};
    if (block) where.block = block;
    if (status) where.status = status;

    const rooms = await Room.findAll({
      where,
      include: [{ model: Student, as: "students", attributes: ["id", "name", "roll_no"], where: { is_active: true }, required: false }],
      order: [["block", "ASC"], ["room_number", "ASC"]],
    });

    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/room ──────────────────────────────────────────────────────
exports.createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    req.app.get("io").emit("dataUpdated", { type: "room_added" });
    res.status(201).json({ success: true, message: "Room created.", data: room });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/notice ────────────────────────────────────────────────────
exports.postNotice = async (req, res, next) => {
  try {
    const { title, message, target_role, target_block, pinned } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "title and message are required." });

    const hours = req.body.duration ? parseInt(req.body.duration) : 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const notice = await Notice.create({
      title,
      message,
      created_by: req.user.id,
      target_role: target_role || "all",
      target_block: target_block || null,
      pinned: pinned || false,
      expires_at: expiresAt,
    });

    // Broadcast notice to all connected clients instantly
    req.app.get("io").emit("newNotice", {
      id: notice.id,
      title: notice.title,
      message: notice.message,
      target_role: notice.target_role,
      created_at: notice.created_at,
      expires_at: notice.expires_at,
    });

    res.status(201).json({ success: true, message: "Notice posted.", data: notice });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/notices ────────────────────────────────────────────────────
exports.getNotices = async (req, res, next) => {
  try {
    const { Op } = require("sequelize");
    const notices = await Notice.findAll({
      where: {
        [Op.or]: [
          { expires_at: { [Op.gt]: new Date() } },
          { expires_at: null }
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

// ── POST /api/admin/fee/bulk ──────────────────────────────────────────────────
// Generate fee records for all active students
exports.generateMonthlyFees = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { month, year, due_date } = req.body;
    if (!month || !year || !due_date) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "month, year, due_date required." });
    }

    const monthLabel = `${month} ${year}`;
    const students = await Student.findAll({
      where: { is_active: true },
      include: [{ model: Room, as: "room" }],
    });

    const feeRecords = students.map((s) => ({
      student_id: s.id,
      month: monthLabel,
      total_amount: s.room ? parseFloat(s.room.monthly_rent) : 5000,
      paid_amount: 0,
      status: "pending",
      due_date,
    }));

    await Fee.bulkCreate(feeRecords, { ignoreDuplicates: true, transaction: t });
    await t.commit();

    req.app.get("io").emit("dataUpdated", { type: "fees_generated", month: monthLabel });
    res.json({ success: true, message: `Fee records generated for ${feeRecords.length} students.` });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── GET /api/admin/warden ─ Create warden ────────────────────────────────────
exports.createWarden = async (req, res, next) => {
  try {
    const { name, warden_id, block, password } = req.body;
    if (!name || !warden_id || !block || !password) {
      return res.status(400).json({ success: false, message: "name, warden_id, block, password required." });
    }
    const user = await User.create({ name, role: "warden", warden_id, block, password });
    res.status(201).json({ success: true, message: "Warden created.", data: { id: user.id, name, warden_id, block } });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/admin/notice/:id ──────────────────────────────────────────────
exports.deleteNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notice = await Notice.findByPk(id);
    if (!notice) return res.status(404).json({ success: false, message: "Notice not found." });
    
    await notice.destroy();
    
    req.app.get("io").emit("dataUpdated", { type: "notice_deleted", id });
    
    res.json({ success: true, message: "Notice deleted." });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admin/fee/:id/pay ───────────────────────────────────────────────
exports.markFeePaid = async (req, res, next) => {
  try {
    const fee = await Fee.findByPk(req.params.id, {
      include: [{ model: Student, as: "student", attributes: ["id", "name", "roll_no"] }],
    });
    if (!fee) return res.status(404).json({ success: false, message: "Fee record not found." });
    if (fee.status === "paid") return res.status(400).json({ success: false, message: "Fee is already paid." });

    await fee.update({
      status: "paid",
      paid_amount: fee.total_amount,
      payment_date: new Date(),
    });

    if (fee.student) {
      req.app.get("io").to(`student_${fee.student.user_id}`).emit("feeUpdated", {
        fee_id: fee.id,
        status: "paid",
        paid_amount: fee.total_amount,
      });
    }

    res.json({ success: true, message: `Fee marked as paid for ${fee.student?.name || "student"}.`, data: fee });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/activity ────────────────────────────────────────────────
exports.getActivity = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [complaints, gatePasses, fines, notices] = await Promise.all([
      Complaint.findAll({
        where: { created_at: { [Op.gte]: todayStart } },
        include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
        order: [["created_at", "DESC"]],
        limit: 10,
      }),
      GatePass.findAll({
        where: { created_at: { [Op.gte]: todayStart } },
        include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
        order: [["created_at", "DESC"]],
        limit: 10,
      }),
      Fine.findAll({
        where: { created_at: { [Op.gte]: todayStart } },
        include: [{ model: Student, as: "student", attributes: ["name", "roll_no"] }],
        order: [["createdAt", "DESC"]],
        limit: 10,
      }),
      Notice.findAll({
        where: { created_at: { [Op.gte]: todayStart } },
        include: [{ model: User, as: "creator", attributes: ["name"] }],
        order: [["created_at", "DESC"]],
        limit: 10,
      }),
    ]);

    // Merge into a single timeline, sorted by time
    const timeline = [
      ...complaints.map(c => ({
        type: "complaint",
        icon: c.category === "Housekeeping" || c.category === "cleaning" ? "🧹" : "💬",
        text: `${c.student?.name || "Student"} raised a ${c.category} complaint: "${c.subject}"`,
        status: c.status,
        time: c.created_at,
      })),
      ...gatePasses.map(g => ({
        type: "gatepass",
        icon: "📄",
        text: `Gate pass ${g.status === "approved" ? "approved" : g.status === "rejected" ? "rejected" : "requested"} for ${g.student?.name || "Student"} → ${g.destination}`,
        status: g.status,
        time: g.created_at,
      })),
      ...fines.map(f => ({
        type: "fine",
        icon: "⚠️",
        text: `Fine of ₹${parseFloat(f.amount).toFixed(0)} issued to ${f.student?.name || f.roll_no}: ${f.reason}`,
        status: f.status,
        time: f.created_at || f.createdAt,
      })),
      ...notices.map(n => ({
        type: "notice",
        icon: "📢",
        text: `Notice posted by ${n.creator?.name || "Admin"}: "${n.title}"`,
        status: "active",
        time: n.created_at,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: timeline,
      counts: {
        complaints: complaints.length,
        gate_passes: gatePasses.length,
        fines: fines.length,
        notices: notices.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admin/reminder/:id/pay ──────────────────────────────────────────
exports.markReminderPaid = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id, {
      include: [{ model: Student, as: "student" }]
    });
    if (!notification) return res.status(404).json({ success: false, message: "Reminder not found." });

    await notification.update({ status: "paid" });

    // If it's a fee reminder and has a fee_id, we could also mark the fee as paid
    // but the user prompt says "Mark as Paid button on each reminder"
    // so we'll just update the notification status for now.

    req.app.get("io").to(`student_${notification.student.user_id}`).emit("reminderUpdated", {
      notification_id: notification.id,
      status: "paid",
    });

    res.json({ success: true, message: "Reminder marked as paid." });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/assign-room ──────────────────────────────────────────────
exports.assignRoom = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { roll_no, room_id } = req.body;
    if (!roll_no || !room_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "roll_no and room_id are required." });
    }

    const student = await Student.findOne({ where: { roll_no } });
    if (!student) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const room = await Room.findByPk(room_id);
    if (!room) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    if (room.current_occupancy >= room.capacity) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Selected room is already at full capacity." });
    }

    // Handle old room occupancy if student was already assigned
    if (student.room_id) {
      await Room.decrement("current_occupancy", { where: { id: student.room_id }, transaction: t });
      await Room.update({ status: "available" }, { where: { id: student.room_id }, transaction: t });
    }

    // Gender Block Validation
    if (student.gender === 'male' && room.block !== 'A') {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Boys can only be assigned to Block A." });
    }
    if (student.gender === 'female' && room.block !== 'B') {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Girls can only be assigned to Block B." });
    }

    // Assign new room
    const room_no = `${room.block}-${room.room_number}`;
    await student.update({ room_id, room_no }, { transaction: t });
    await Room.increment("current_occupancy", { where: { id: room_id }, transaction: t });
    
    // Update new room status
    const updatedRoom = await Room.findByPk(room_id, { transaction: t });
    if (updatedRoom.current_occupancy >= updatedRoom.capacity) {
      await updatedRoom.update({ status: "occupied" }, { transaction: t });
    } else {
      await updatedRoom.update({ status: "available" }, { transaction: t });
    }

    await t.commit();

    // Trigger real-time updates
    const io = req.app.get("io");
    io.emit("dataUpdated", { type: "room_assigned", student_id: student.id, room_id });
    io.to(`student_${student.user_id}`).emit("dataUpdated", { type: "room_assigned" });

    res.json({ success: true, message: `Room ${room.room_number} assigned to ${student.name}.`, data: student });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
