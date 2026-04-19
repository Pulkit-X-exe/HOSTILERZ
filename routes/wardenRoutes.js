// routes/wardenRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/wardenController");

// All warden routes require auth + warden role
router.use(protect, authorize("warden"));

router.get("/overview",                   ctrl.getOverview);
router.get("/students",                   ctrl.getBlockStudents);
router.get("/rooms",                      ctrl.getBlockRooms);

// Gate Pass
router.get("/gatepasses",                 ctrl.getGatePasses);
router.post("/gatepass/approve",          ctrl.approveGatePass);
router.post("/gatepass/reject",           ctrl.rejectGatePass);

// Attendance
router.get("/attendance",                 ctrl.getAttendance);
router.post("/attendance",                ctrl.markAttendance);

// Fines
router.post("/fine",                      ctrl.issueFine);
router.get("/fines",                      ctrl.getFines);
router.put("/fine/:id/pay",               ctrl.markFinePaid);

// Notices
router.post("/notice",                    ctrl.postNotice);
router.get("/notices",                    ctrl.getNotices);

// Complaints Dashboard
router.get("/complaints",                 ctrl.getComplaints);
router.put("/complaint/:id",              ctrl.updateComplaintStatus);
// Room Management
router.put("/room/:id/status",             ctrl.updateRoomStatus);

module.exports = router;

