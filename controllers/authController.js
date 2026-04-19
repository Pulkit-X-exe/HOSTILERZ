// controllers/authController.js
const jwt = require("jsonwebtoken");
const { User, Student } = require("../models");
const { body, validationResult } = require("express-validator");

// Helper: sign JWT
const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Helper: send token response
const sendTokenResponse = (res, user, extraData = {}) => {
  const token = signToken(user.id, user.role);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      block: user.block || null,
      profile_pic: user.profile_pic || null,
      ...extraData,
    },
  });
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = [
  body("identifier").notEmpty().withMessage("Identifier (roll_no / admin_id / warden_id) is required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("role").isIn(["student", "admin", "warden"]).withMessage("Role must be student, admin, or warden"),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { identifier, password, role, block } = req.body;

      // Build query based on role
      let where = { role };
      if (role === "student") where.roll_no = identifier;
      else if (role === "admin") where.admin_id = identifier;
      else if (role === "warden") {
        where.warden_id = identifier;
        // Block validation for wardens
        if (block && where.block !== block) {
          // We'll check the block after fetching
        }
      }

      const user = await User.findOne({ where });

      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      // Warden block validation
      if (role === "warden" && block && user.block !== block) {
        return res.status(401).json({ success: false, message: `You are not assigned to Block ${block}.` });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: "Account is deactivated. Contact admin." });
      }

      // For students, also fetch their student profile ID
      let extraData = {};
      if (role === "student") {
        const studentProfile = await Student.findOne({ where: { user_id: user.id } });
        if (studentProfile) extraData.student_id = studentProfile.id;
        extraData.roll_no = user.roll_no;
      } else if (role === "admin") {
        extraData.admin_id = user.admin_id;
      } else if (role === "warden") {
        extraData.warden_id = user.warden_id;
        extraData.block = user.block;
      }

      sendTokenResponse(res, user, extraData);
    } catch (err) {
      next(err);
    }
  },
];

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/change-password ───────────────────────────────────────────
exports.changePassword = [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 chars"),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const user = await User.findByPk(req.user.id);
      const isMatch = await user.comparePassword(req.body.currentPassword);
      if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect." });

      user.password = req.body.newPassword;
      await user.save();

      res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
      next(err);
    }
  },
];
