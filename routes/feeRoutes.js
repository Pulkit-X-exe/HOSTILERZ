const express = require("express");
const router = express.Router();
const { Student, Notification } = require("../models");
const { protect, authorize } = require("../middleware/auth");

/**
 * @desc    Send a quick fee reminder by roll number
 * @route   POST /api/fees/reminder
 * @access  Private (Admin)
 */
async function sendFeeReminder(req, res) {
  try {
    const { rollNo } = req.body;

    if (!rollNo) {
      return res.status(400).json({
        success: false,
        message: "Roll number is required"
      });
    }

    const student = await Student.findOne({
      where: { roll_no: rollNo, is_active: true }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const notification = await Notification.create({
      student_id: student.id,
      title: "Fee Payment Reminder",
      message: "Your fees is pending. Please pay as soon as possible.",
      type: "fee_reminder",
      status: "pending"
    });

    // Real-time emit to student
    const io = req.app.get("io");
    if (io) {
      io.to(`student_${student.user_id}`).emit("feeReminder", {
        notification_id: notification.id,
        title: notification.title,
        message: notification.message,
        status: "pending",
        created_at: notification.createdAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee reminder sent successfully"
    });

  } catch (error) {
    console.error("Fee Reminder Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

router.post("/reminder", protect, authorize("admin"), sendFeeReminder);




module.exports = router;
