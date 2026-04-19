// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.stack);

  // Sequelize validation error
  if (err.name === "SequelizeValidationError") {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation error", errors: messages });
  }

  // Sequelize unique constraint
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors[0]?.path || "field";
    return res.status(400).json({ success: false, message: `${field} already exists.` });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
