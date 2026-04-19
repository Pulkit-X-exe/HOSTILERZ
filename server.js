// server.js  –  HOSTILERZ Backend Entry Point
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const { connectDB } = require("./config/database");
require("./models"); // load all models + associations

const authRoutes    = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes   = require("./routes/adminRoutes");
const wardenRoutes  = require("./routes/wardenRoutes");
const feeRoutes     = require("./routes/feeRoutes");
const errorHandler  = require("./middleware/errorHandler");

const app    = express();
const server = http.createServer(app);

// ── Socket.IO setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

// ── Socket.IO connection handler ──────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  /**
   * Client emits "join" with their role + id after login:
   *   { role: "student", id: 12 }          → joins room "student_12"
   *   { role: "admin" }                     → joins room "admin_room"
   *   { role: "warden", block: "A" }        → joins rooms "warden_room" + "warden_A"
   */
  socket.on("join", ({ role, id, block }) => {
    if (role === "student" && id) {
      socket.join(`student_${id}`);
      console.log(`👤 Student ${id} joined their room`);
    } else if (role === "admin") {
      socket.join("admin_room");
      console.log(`🏛  Admin joined admin_room`);
    } else if (role === "warden") {
      socket.join("warden_room");
      if (block) socket.join(`warden_${block}`);
      console.log(`🔑 Warden joined warden_room${block ? ` + warden_${block}` : ""}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });

  // Ping-pong for connection health-check
  socket.on("ping_server", () => socket.emit("pong_server", { time: Date.now() }));
});

// ── Express Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/warden",  wardenRoutes);
app.use("/api/fees",    feeRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "HOSTILERZ API is running 🚀",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Public Stats (for Landing) ────────────────────────────────────────────────
const { Student, Room } = require("./models");
app.get("/api/public-stats", async (req, res) => {
  try {
    const students = await Student.count({ where: { is_active: true } });
    const rooms = await Room.count();
    const available = await Room.count({ where: { status: "available" } });
    res.json({ success: true, data: { students, rooms, available, blocks: 2 } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

// ── Test Mail Route ───────────────────────────────────────────────────────────
const nodemailer = require("nodemailer");
app.get("/api/test-mail", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // sending to self for test
      subject: "TEST MAIL",
      text: "This is a test",
    });
    console.log("Test email sent:", info.response);
    
    res.json({ success: true, message: "Test email sent successfully!", response: info.response });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ success: false, message: "Failed to send test email.", error: err.message });
  }
});

// ── Serve Frontend ────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/hostilerz-socket-client.js", (req, res) => res.sendFile(path.join(__dirname, "hostilerz-socket-client.js")));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const runExpiryWorker = require("./workers/expiryWorker");

const start = async () => {
  // Try to connect to DB in background (non-blocking)
  connectDB().catch(err => console.error("Critical DB failure during startup:", err));

  server.listen(PORT, () => {
    console.log(`\n🚀 HOSTILERZ Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
    
    // Kick off automatic cleanup workers
    runExpiryWorker();
  });
};

start();
