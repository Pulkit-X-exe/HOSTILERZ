// routes/studentRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/studentController");

// All student routes require auth + student role
router.use(protect, authorize("student"));

router.get("/dashboard",    ctrl.getDashboard);
router.get("/notices",      ctrl.getNotices);
router.get("/notifications", ctrl.getNotifications);
router.get("/room",         ctrl.getRoom);
router.get("/fees",         ctrl.getFees);
router.get("/complaints",   ctrl.getComplaints);
router.post("/complaint",   upload.single("attachment"), ctrl.raiseComplaint);
router.get("/gatepasses",   ctrl.getGatePasses);
router.post("/gatepass",    ctrl.requestGatePass);
router.get("/attendance",   ctrl.getAttendance);
router.get("/idcard",       ctrl.getIdCard);
router.post("/upload-photo", upload.single("photo"), ctrl.uploadPhoto);

module.exports = router;
