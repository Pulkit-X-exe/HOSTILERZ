// middleware/auth.js
const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Verifies the JWT token in the Authorization header.
 * Attaches `req.user` on success.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "name", "role", "roll_no", "admin_id", "warden_id", "block", "profile_pic", "is_active"],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: "User not found or account deactivated." });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    
    // Log the actual error for debugging
    console.error("🔒 Auth Middleware Error:", err);
    
    // Only return "Invalid token" if it's actually a JWT error, otherwise return 500
    if (err.name === "JsonWebTokenError" || err.message.includes("jwt")) {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
    
    return res.status(500).json({ success: false, message: "Authentication server error." });
  }
};

/**
 * Factory: allow only specific roles.
 * Usage: authorize("admin"), authorize("warden","admin")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(", ")}.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
