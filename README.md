# 🏠 HOSTILERZ – Backend System

> Production-ready Node.js + MySQL backend for the HOSTILERZ Hostel Management System.
> Replaces ALL frontend dummy data with a fully dynamic, real-time database-driven backend.

---

## 📁 Project Structure

```
/server
├── server.js                    ← Entry point (Express + Socket.IO)
├── .env.example                 ← Environment variable template
├── hostilerz-socket-client.js   ← Frontend Socket.IO integration helper
├── package.json
│
├── /config
│   ├── database.js              ← Sequelize connection
│   ├── schema.sql               ← Raw SQL CREATE TABLE statements
│   └── seeder.js               ← Seed DB with sample data
│
├── /models
│   ├── index.js                 ← Loads models + wires associations
│   ├── User.js
│   ├── Student.js
│   ├── Room.js
│   ├── Fee.js
│   ├── Complaint.js
│   ├── GatePass.js
│   ├── Attendance.js
│   ├── Notice.js
│   └── Visitor.js
│
├── /controllers
│   ├── authController.js
│   ├── studentController.js
│   ├── adminController.js
│   └── wardenController.js
│
├── /routes
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   ├── adminRoutes.js
│   └── wardenRoutes.js
│
├── /middleware
│   ├── auth.js                  ← JWT verify + role-based access
│   ├── upload.js                ← Multer config
│   └── errorHandler.js
│
└── /uploads                     ← Uploaded profile pictures
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.x running locally

### Step 1 – Clone & Install
```bash
cd hostilerz-backend
npm install
```

### Step 2 – Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hostilerz_db
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=some_very_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://127.0.0.1:5500
```

### Step 3 – Create the Database
```bash
mysql -u root -p -e "CREATE DATABASE hostilerz_db CHARACTER SET utf8mb4;"
```
Or run the schema manually:
```bash
mysql -u root -p hostilerz_db < config/schema.sql
```

### Step 4 – Seed Sample Data
```bash
npm run seed
```

### Step 5 – Start the Server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs at: **http://localhost:5000**  
Health check:   **GET http://localhost:5000/api/health**

---

## 🔑 Test Credentials (after seeding)

| Role    | Identifier  | Password    | Extra        |
|---------|-------------|-------------|--------------|
| Admin   | ADM001      | password123 | —            |
| Warden  | WRD001      | password123 | block = A    |
| Student | CSE2021001  | password123 | —            |

---

## 📡 API Reference

### Auth
```
POST /api/auth/login
Body: { "identifier": "CSE2021001", "password": "password123", "role": "student" }

GET  /api/auth/me                       (Bearer token required)
PUT  /api/auth/change-password          (Bearer token required)
```

### Student Endpoints  `(Authorization: Bearer <student_token>)`
```
GET  /api/student/dashboard
GET  /api/student/room
GET  /api/student/fees
GET  /api/student/complaints
POST /api/student/complaint             (multipart/form-data: category, subject, description, priority, attachment?)
GET  /api/student/gatepasses
POST /api/student/gatepass              { destination, reason, departure_time, return_time, pass_type }
GET  /api/student/attendance            ?month=3&year=2025
GET  /api/student/idcard
POST /api/student/upload-photo          (multipart/form-data: photo)
```

### Admin Endpoints  `(Authorization: Bearer <admin_token>)`
```
GET    /api/admin/dashboard
GET    /api/admin/students              ?search=arjun&page=1&limit=20
POST   /api/admin/student               { name, roll_no, course, year, contact, email, room_id, password, ... }
PUT    /api/admin/student/:id
DELETE /api/admin/student/:id
GET    /api/admin/rooms                 ?block=A&status=available
POST   /api/admin/room                  { room_number, block, floor, type, capacity, monthly_rent, amenities }
GET    /api/admin/complaints            ?status=pending&category=maintenance
PUT    /api/admin/complaint/:id         { status, admin_remarks, priority }
GET    /api/admin/fees                  ?status=overdue
PUT    /api/admin/fee/:id               { paid_amount, payment_method, transaction_id }
POST   /api/admin/fees/generate         { month, year, due_date }
GET    /api/admin/notices
POST   /api/admin/notice                { title, message, target_role, pinned }
POST   /api/admin/warden               { name, warden_id, block, password }
```

### Warden Endpoints  `(Authorization: Bearer <warden_token>)`
```
GET  /api/warden/overview
GET  /api/warden/students
GET  /api/warden/gatepasses             ?status=pending
POST /api/warden/gatepass/approve       { gate_pass_id, remarks }
POST /api/warden/gatepass/reject        { gate_pass_id, remarks }
GET  /api/warden/attendance             ?date=2025-03-28
POST /api/warden/attendance             { date, records: [{student_id, status, remarks}] }
GET  /api/warden/visitors               ?active_only=true
POST /api/warden/visitor                { student_id, visitor_name, relation, contact, purpose }
PUT  /api/warden/visitor/:id/checkout
```

---

## ⚡ Real-Time Socket.IO Events

Include the helper in your frontend:
```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="hostilerz-socket-client.js"></script>
```

After login:
```javascript
// Student
HostilerzSocket.connect(token, "student", { id: student_id });
HostilerzSocket.on("gatePassApproved", ({ qr_code }) => {
  document.getElementById("qr-img").src = qr_code;
});

// Admin
HostilerzSocket.connect(token, "admin");
HostilerzSocket.on("newComplaint", (data) => refreshComplaintsTable());

// Warden
HostilerzSocket.connect(token, "warden", { block: "A" });
HostilerzSocket.on("newGatePassRequest", (data) => addToGatePassList(data));
```

### All Emitted Events

| Event               | Emitted To            | Payload                                              |
|---------------------|-----------------------|------------------------------------------------------|
| `newComplaint`      | `admin_room`          | complaint_id, student_name, category, priority       |
| `newGatePassRequest`| `warden_room`/block   | gate_pass_id, student_name, destination, times       |
| `gatePassApproved`  | `student_{id}`        | gate_pass_id, qr_code (base64), approved_by          |
| `gatePassRejected`  | `student_{id}`        | gate_pass_id, warden_remarks                         |
| `complaintUpdated`  | `student_{id}`        | complaint_id, status, admin_remarks                  |
| `feeUpdated`        | `student_{id}`        | fee_id, status, paid_amount                          |
| `newNotice`         | all                   | id, title, message, target_role                      |
| `dataUpdated`       | varies                | { type: "student_added" / "room_added" / ... }       |

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** tokens expire in 7 days
- **Role-based middleware** blocks unauthorised access per route
- Sequelize ORM with parameterised queries prevents **SQL injection**
- Multer validates file types (JPEG/PNG/WEBP only, max 5MB)
- `.env` keeps all secrets out of source code

---

## 📊 Example API Responses

### Login Success
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": 6,
    "name": "Arjun Mehta",
    "role": "student",
    "roll_no": "CSE2021001",
    "student_id": 1
  }
}
```

### Student Dashboard
```json
{
  "success": true,
  "data": {
    "student": { "name": "Arjun Mehta", "roll_no": "CSE2021001", "course": "B.Tech CSE" },
    "room": { "room_number": "A101", "block": "A", "type": "double", "status": "occupied" },
    "fee_status": { "total": "4500.00", "paid": "4500.00", "status": "paid", "due_date": "2025-03-05" },
    "stats": { "open_complaints": 0, "pending_gate_passes": 0, "attendance_percentage": 92 },
    "notices": [...]
  }
}
```

### Gate Pass Approved (Socket.IO)
```json
{
  "gate_pass_id": 1,
  "status": "approved",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "approved_by": "Mr. Suresh Nair",
  "warden_remarks": "Approved. Return by 8 PM."
}
```
