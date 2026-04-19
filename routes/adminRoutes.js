// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

// All admin routes require auth + admin role
router.use(protect, authorize("admin"));

// Dashboard
router.get("/dashboard",          ctrl.getDashboard);
router.get("/activity",           ctrl.getActivity);

// Students
router.get("/students",           ctrl.getStudents);
router.post("/student",           ctrl.createStudent);
router.put("/student/:id",        ctrl.updateStudent);
router.delete("/student/:id",     ctrl.deleteStudent);
router.post("/assign-room",       ctrl.assignRoom);

// Rooms
router.get("/rooms",              ctrl.getRooms);
router.post("/room",              ctrl.createRoom);

// Complaints
router.get("/complaints",         ctrl.getComplaints);
router.put("/complaint/:id",      ctrl.updateComplaint);

// Fees
router.get("/fees",               ctrl.getFees);
router.put("/fee/:id",            ctrl.updateFee);
router.put("/fee/:id/pay",        ctrl.markFeePaid);
router.post("/fees/generate",     ctrl.generateMonthlyFees);
router.post("/fee-reminder",      ctrl.sendFeeReminder);
router.post("/fee-reminder/roll-no", ctrl.sendFeeReminderByRollNo);
router.put("/reminder/:id/pay",   ctrl.markReminderPaid);

// Notices
router.get("/notices",            ctrl.getNotices);
router.post("/notice",            ctrl.postNotice);
router.delete("/notice/:id",      ctrl.deleteNotice);

// Warden management
router.post("/warden",            ctrl.createWarden);

module.exports = router;
