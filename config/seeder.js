// config/seeder.js  –  Seeds the DB with sample data for all roles
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { connectDB, sequelize } = require("./database");
require("../models"); // load all models

const {
  User, Room, Student, Fee, Complaint, GatePass, Attendance, Notice, Visitor,
} = require("../models");

const seed = async () => {
  await connectDB();
  console.log("\n🌱 Starting database seed...\n");

  // ── Clear existing data (order matters for FK constraints) ──────────────────
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const model of [Visitor, Attendance, GatePass, Complaint, Fee, Student, Notice, Room, User]) {
    await model.destroy({ truncate: true, cascade: true });
  }
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("🗑  Cleared existing data");

  // ── 1. Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const users = await User.bulkCreate([
    // Admin
    { name: "Rajesh Kumar",   role: "admin",   admin_id:  "ADM001", password: passwordHash },
    { name: "Priya Sharma",   role: "admin",   admin_id:  "ADM002", password: passwordHash },

    // Wardens
    { name: "Mr. Suresh Nair",    role: "warden", warden_id: "WRD001", block: "A", password: passwordHash },
    { name: "Mr. Anil Verma",     role: "warden", warden_id: "WRD002", block: "B", password: passwordHash },
    { name: "Ms. Kavitha Reddy",  role: "warden", warden_id: "WRD003", block: "A", password: passwordHash },

    // Students
    { name: "Arjun Mehta",      role: "student", roll_no: "CSE2021001", password: passwordHash },
    { name: "Sneha Patel",      role: "student", roll_no: "CSE2021002", password: passwordHash },
    { name: "Rohan Singh",      role: "student", roll_no: "ECE2021003", password: passwordHash },
    { name: "Priya Nair",       role: "student", roll_no: "ME2021004",  password: passwordHash },
    { name: "Karthik Rajan",    role: "student", roll_no: "CSE2022005", password: passwordHash },
    { name: "Divya Krishnan",   role: "student", roll_no: "IT2022006",  password: passwordHash },
    { name: "Amit Tiwari",      role: "student", roll_no: "CSE2022007", password: passwordHash },
    { name: "Riya Joshi",       role: "student", roll_no: "ECE2022008", password: passwordHash },
  ], { returning: true });

  console.log(`✅ Created ${users.length} users`);

  // Convenient references
  const [admin1, admin2, warden1, warden2, warden3,
         u_arjun, u_sneha, u_rohan, u_priya, u_karthik, u_divya, u_amit, u_riya] = users;

  // ── 2. Rooms ────────────────────────────────────────────────────────────────
  const rooms = await Room.bulkCreate([
    // Block A
    { room_number: "A101", block: "A", floor: 1, type: "double", capacity: 2, current_occupancy: 2, status: "occupied",  monthly_rent: 4500, amenities: ["wifi", "fan", "study_table"] },
    { room_number: "A102", block: "A", floor: 1, type: "single", capacity: 1, current_occupancy: 1, status: "occupied",  monthly_rent: 6000, amenities: ["wifi", "ac", "fan", "study_table", "wardrobe"] },
    { room_number: "A103", block: "A", floor: 1, type: "double", capacity: 2, current_occupancy: 0, status: "available", monthly_rent: 4500, amenities: ["wifi", "fan"] },
    { room_number: "A201", block: "A", floor: 2, type: "triple", capacity: 3, current_occupancy: 1, status: "available", monthly_rent: 3500, amenities: ["fan", "study_table"] },

    // Block B
    { room_number: "B101", block: "B", floor: 1, type: "double", capacity: 2, current_occupancy: 2, status: "occupied",  monthly_rent: 4500, amenities: ["wifi", "fan", "study_table"] },
    { room_number: "B102", block: "B", floor: 1, type: "single", capacity: 1, current_occupancy: 1, status: "occupied",  monthly_rent: 6000, amenities: ["wifi", "ac", "study_table"] },
    { room_number: "B201", block: "B", floor: 2, type: "double", capacity: 2, current_occupancy: 0, status: "available", monthly_rent: 4500, amenities: ["fan"] },

    // Block C (Mapped to A)
    { room_number: "A301", block: "A", floor: 3, type: "single", capacity: 1, current_occupancy: 1, status: "occupied",  monthly_rent: 6000, amenities: ["wifi", "ac"] },
    { room_number: "A302", block: "A", floor: 3, type: "double", capacity: 2, current_occupancy: 1, status: "available", monthly_rent: 4500, amenities: ["wifi", "fan"] },
    { room_number: "A303", block: "A", floor: 3, type: "triple", capacity: 3, current_occupancy: 0, status: "maintenance", monthly_rent: 3500, amenities: ["fan"] },
  ], { returning: true });

  console.log(`✅ Created ${rooms.length} rooms`);
  const [rA101, rA102, rA103, rA201, rB101, rB102, rB201, rC101, rC102, rC201] = rooms;

  // ── 3. Student Profiles ──────────────────────────────────────────────────────
  const students = await Student.bulkCreate([
    { user_id: u_arjun.id,  roll_no: "CSE2021001", name: "Arjun Mehta",    course: "B.Tech CSE",    year: 3, contact: "9876543210", email: "arjun@hostilerz.edu",    room_id: rA101.id, guardian_name: "Ramesh Mehta",   guardian_contact: "9876543200", join_date: "2021-07-15" },
    { user_id: u_sneha.id,  roll_no: "CSE2021002", name: "Sneha Patel",    course: "B.Tech CSE",    year: 3, contact: "9876543211", email: "sneha@hostilerz.edu",    room_id: rA101.id, guardian_name: "Sunil Patel",    guardian_contact: "9876543201", join_date: "2021-07-15" },
    { user_id: u_rohan.id,  roll_no: "ECE2021003", name: "Rohan Singh",    course: "B.Tech ECE",    year: 3, contact: "9876543212", email: "rohan@hostilerz.edu",    room_id: rA102.id, guardian_name: "Mahesh Singh",   guardian_contact: "9876543202", join_date: "2021-07-16" },
    { user_id: u_priya.id,  roll_no: "ME2021004",  name: "Priya Nair",     course: "B.Tech ME",     year: 3, contact: "9876543213", email: "priya@hostilerz.edu",    room_id: rB101.id, guardian_name: "Suresh Nair",    guardian_contact: "9876543203", join_date: "2021-07-16" },
    { user_id: u_karthik.id,roll_no: "CSE2022005", name: "Karthik Rajan",  course: "B.Tech CSE",    year: 2, contact: "9876543214", email: "karthik@hostilerz.edu",  room_id: rB101.id, guardian_name: "Rajan P",        guardian_contact: "9876543204", join_date: "2022-07-18" },
    { user_id: u_divya.id,  roll_no: "IT2022006",  name: "Divya Krishnan", course: "B.Tech IT",     year: 2, contact: "9876543215", email: "divya@hostilerz.edu",    room_id: rB102.id, guardian_name: "Krishnan M",     guardian_contact: "9876543205", join_date: "2022-07-18" },
    { user_id: u_amit.id,   roll_no: "CSE2022007", name: "Amit Tiwari",    course: "B.Tech CSE",    year: 2, contact: "9876543216", email: "amit@hostilerz.edu",     room_id: rC101.id, guardian_name: "Vinod Tiwari",   guardian_contact: "9876543206", join_date: "2022-07-19" },
    { user_id: u_riya.id,   roll_no: "ECE2022008", name: "Riya Joshi",     course: "B.Tech ECE",    year: 2, contact: "9876543217", email: "riya@hostilerz.edu",     room_id: rC102.id, guardian_name: "Ankit Joshi",    guardian_contact: "9876543207", join_date: "2022-07-19" },
  ], { returning: true });

  console.log(`✅ Created ${students.length} student profiles`);
  const [sArjun, sSneha, sRohan, sPriya, sKarthik, sDivya, sAmit, sRiya] = students;

  // ── 4. Fees ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const months = ["December 2024", "January 2025", "February 2025", "March 2025"];
  const feeRecords = [];

  for (const student of students) {
    const room = rooms.find((r) => r.id === student.room_id);
    const rent = room ? parseFloat(room.monthly_rent) : 4500;

    months.forEach((month, i) => {
      const isPast = i < 3;
      feeRecords.push({
        student_id: student.id,
        month,
        total_amount: rent,
        paid_amount: isPast ? (i === 1 && student.id === sPriya.id ? 0 : rent) : 0,
        status: isPast
          ? (i === 1 && student.id === sPriya.id ? "overdue" : "paid")
          : "pending",
        due_date: new Date(2024 + Math.floor((i + 11) / 12), (i + 11) % 12, 5),
        payment_date: isPast && !(i === 1 && student.id === sPriya.id) ? new Date(2024 + Math.floor((i + 11) / 12), (i + 11) % 12, 3) : null,
        payment_method: isPast ? "upi" : null,
      });
    });
  }

  await Fee.bulkCreate(feeRecords);
  console.log(`✅ Created ${feeRecords.length} fee records`);

  // ── 5. Complaints ─────────────────────────────────────────────────────────────
  const complaints = await Complaint.bulkCreate([
    { student_id: sArjun.id,   category: "maintenance", subject: "Leaking tap in bathroom",     description: "The tap in bathroom has been leaking for 3 days. Water is wasted.",  status: "resolved",     priority: "high",   resolved_at: new Date(), admin_remarks: "Plumber dispatched and issue fixed." },
    { student_id: sSneha.id,   category: "electricity",  subject: "Tube light not working",       description: "The tube light in room A101 is flickering and not working properly.", status: "in_progress",  priority: "medium" },
    { student_id: sRohan.id,   category: "internet",     subject: "WiFi very slow in block A",    description: "WiFi speed is very slow especially after 8 PM. Streaming is impossible.", status: "pending",   priority: "medium" },
    { student_id: sPriya.id,   category: "food",         subject: "Quality of dinner very bad",   description: "Dinner quality has dropped significantly. Food is undercooked.",        status: "pending",   priority: "high" },
    { student_id: sKarthik.id, category: "cleanliness",  subject: "Common washroom not cleaned",  description: "The common washroom on floor 1 has not been cleaned since 2 days.",     status: "pending",   priority: "medium" },
    { student_id: sDivya.id,   category: "security",     subject: "Gate not being checked at night", description: "The gate security is lax after 11 PM. Anyone can walk in.",          status: "in_progress", priority: "high" },
    { student_id: sAmit.id,    category: "water",        subject: "No hot water in block C",      description: "Hot water geyser in block C is not working since last week.",            status: "resolved",  priority: "high",   resolved_at: new Date(), admin_remarks: "Geyser replaced." },
    { student_id: sRiya.id,    category: "other",        subject: "Request for extra blanket",    description: "Temperature has dropped. Request for extra blanket in room C102.",       status: "resolved",  priority: "low",    resolved_at: new Date(), admin_remarks: "Blanket provided." },
  ]);
  console.log(`✅ Created ${complaints.length} complaints`);

  // ── 6. Gate Passes ────────────────────────────────────────────────────────────
  const { v4: uuidv4 } = require("uuid");
  const QRCode = require("qrcode");

  // One approved pass with QR for Arjun
  const qrToken = uuidv4();
  const qrPayload = JSON.stringify({ pass_id: 1, student: "Arjun Mehta", roll_no: "CSE2021001", destination: "Home - Mumbai", token: qrToken });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 300 });

  await GatePass.bulkCreate([
    { student_id: sArjun.id,   destination: "Home - Mumbai",    reason: "Family function",        departure_time: new Date("2025-03-28 08:00"), return_time: new Date("2025-03-30 20:00"), status: "approved", approved_by: warden1.id, approved_at: new Date(), warden_remarks: "Approved. Return by 8 PM.", pass_type: "weekend", qr_code: qrDataUrl, qr_token: qrToken },
    { student_id: sSneha.id,   destination: "City Hospital",    reason: "Medical checkup",        departure_time: new Date("2025-03-28 10:00"), return_time: new Date("2025-03-28 17:00"), status: "pending",  pass_type: "day" },
    { student_id: sRohan.id,   destination: "Koramangala",      reason: "Brother's birthday",     departure_time: new Date("2025-03-29 09:00"), return_time: new Date("2025-03-29 21:00"), status: "pending",  pass_type: "day" },
    { student_id: sPriya.id,   destination: "Home - Bangalore", reason: "Personal work",          departure_time: new Date("2025-03-27 07:00"), return_time: new Date("2025-03-27 20:00"), status: "rejected", approved_by: warden2.id, warden_remarks: "Insufficient reason provided.", pass_type: "day" },
    { student_id: sKarthik.id, destination: "Lal Bagh",         reason: "College trip",           departure_time: new Date("2025-03-30 06:00"), return_time: new Date("2025-03-30 18:00"), status: "pending",  pass_type: "day" },
  ]);
  console.log("✅ Created 5 gate pass records");

  // ── 7. Attendance ─────────────────────────────────────────────────────────────
  const attendanceData = [];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  for (const student of students) {
    for (const date of last7Days) {
      attendanceData.push({
        student_id: student.id,
        date,
        status: Math.random() > 0.15 ? "present" : (Math.random() > 0.5 ? "absent" : "late"),
        marked_by: warden1.id,
      });
    }
  }
  await Attendance.bulkCreate(attendanceData, { ignoreDuplicates: true });
  console.log(`✅ Created ${attendanceData.length} attendance records`);

  // ── 8. Notices ────────────────────────────────────────────────────────────────
  await Notice.bulkCreate([
    { title: "Hostel Day Celebration 🎉",        message: "Hostel Day will be celebrated on 5th April 2025. All students must participate. Cultural programs, sports, and food stalls are planned.", created_by: admin1.id, target_role: "all",     pinned: true },
    { title: "Fee Deadline – March 2025",         message: "Last date to pay March 2025 hostel fees is 10th March 2025. Late fine of ₹50/day will be charged after the deadline.",              created_by: admin1.id, target_role: "student",  pinned: true },
    { title: "Water Supply Interruption",         message: "Water supply will be suspended on 30th March from 9 AM to 1 PM for maintenance. Please store water in advance.",                    created_by: warden1.id,target_role: "all",     pinned: false },
    { title: "New Mess Menu Effective April",     message: "A new and improved mess menu will be effective from 1st April. Students can view and give feedback at the warden's office.",         created_by: admin2.id, target_role: "student",  pinned: false },
    { title: "Warden Meeting – All Blocks",       message: "All wardens are requested to attend the monthly coordination meeting on 29th March at 4 PM in the Admin Office.",                   created_by: admin1.id, target_role: "warden",   pinned: false },
  ]);
  console.log("✅ Created 5 notices");

  // ── 9. Visitors ───────────────────────────────────────────────────────────────
  await Visitor.bulkCreate([
    { student_id: sArjun.id,   visitor_name: "Ramesh Mehta",  relation: "Father", contact: "9876543200", purpose: "Monthly visit",            check_in: new Date("2025-03-25 10:00"), check_out: new Date("2025-03-25 16:00"), id_proof_type: "Aadhaar", approved_by: warden1.id },
    { student_id: sSneha.id,   visitor_name: "Meena Patel",   relation: "Mother", contact: "9812345678", purpose: "Delivering items",         check_in: new Date("2025-03-26 11:00"), check_out: new Date("2025-03-26 13:00"), id_proof_type: "Aadhaar", approved_by: warden1.id },
    { student_id: sRohan.id,   visitor_name: "Vivek Singh",   relation: "Brother",contact: "9823456789", purpose: "Picking up documents",     check_in: new Date("2025-03-27 14:00"), check_out: null,                         id_proof_type: "PAN",    approved_by: warden1.id },
  ]);
  console.log("✅ Created 3 visitor records");

  console.log(`
╔═══════════════════════════════════════════════════════╗
║         🌱 HOSTILERZ DATABASE SEEDED SUCCESSFULLY      ║
╠═══════════════════════════════════════════════════════╣
║  TEST CREDENTIALS (all passwords: password123)        ║
║                                                       ║
║  ADMIN:   identifier = ADM001  role = admin           ║
║  WARDEN:  identifier = WRD001  role = warden          ║
║           block      = A                             ║
║  STUDENT: identifier = CSE2021001  role = student     ║
╚═══════════════════════════════════════════════════════╝
  `);

  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
