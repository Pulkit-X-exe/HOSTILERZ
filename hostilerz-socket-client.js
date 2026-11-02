/**
 * hostilerz-socket-client.js
 * ─────────────────────────────────────────────────────────────
 * Drop-in Socket.IO client helper for the HOSTILERZ frontend.
 *
 * Usage (in your existing HTML panels):
 *   <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
 *   <script src="hostilerz-socket-client.js"></script>
 *
 * After login, call:
 *   HostilerzSocket.connect(token, role, { id, block });
 *
 * Then listen to events:
 *   HostilerzSocket.on("newComplaint", (data) => { ... });
 */

const HostilerzSocket = (() => {
  const SERVER_URL = (typeof window !== "undefined" && window.location.origin && window.location.origin.startsWith("http")) ? window.location.origin : "http://localhost:5000";
  let socket = null;

  /**
   * Connect + join the correct Socket.IO room based on role.
   * @param {string} token   - JWT from login response
   * @param {string} role    - "student" | "admin" | "warden"
   * @param {object} meta    - { id: studentId } for student
   *                           { block: "A" }    for warden
   */
  function connect(token, role, meta = {}) {
    if (socket && socket.connected) return;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      socket.emit("join", { role, id: meta.id, block: meta.block });
    });

    socket.on("disconnect", (reason) => {
      console.warn("🔌 Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
    });
  }

  function on(event, callback) {
    if (!socket) return console.warn("Socket not connected. Call connect() first.");
    socket.on(event, callback);
  }

  function off(event, callback) {
    if (socket) socket.off(event, callback);
  }

  function disconnect() {
    if (socket) { socket.disconnect(); socket = null; }
  }

  return { connect, on, off, disconnect };
})();

// ─── Example event handlers ───────────────────────────────────────────────────

/*
// ── STUDENT PANEL ────────────────────────────────────────────
HostilerzSocket.connect(token, "student", { id: studentId });

HostilerzSocket.on("gatePassApproved", (data) => {
  // data: { gate_pass_id, status, qr_code, approved_by, warden_remarks }
  document.getElementById("qr-image").src = data.qr_code;
  document.getElementById("pass-status").innerText = "Approved ✅";
  alert(`Gate pass approved by ${data.approved_by}!`);
});

HostilerzSocket.on("gatePassRejected", (data) => {
  document.getElementById("pass-status").innerText = `Rejected ❌ – ${data.warden_remarks}`;
});

HostilerzSocket.on("complaintUpdated", (data) => {
  const el = document.getElementById(`complaint-${data.complaint_id}`);
  if (el) el.querySelector(".status").innerText = data.status;
});

HostilerzSocket.on("feeUpdated", (data) => {
  refreshFeeSummary(); // your existing fetch function
});

HostilerzSocket.on("newNotice", (data) => {
  prependNoticeToBoard(data);
});

// ── ADMIN PANEL ──────────────────────────────────────────────
HostilerzSocket.connect(token, "admin");

HostilerzSocket.on("newComplaint", (data) => {
  // data: { complaint_id, student_name, roll_no, category, subject, priority, created_at }
  showAdminAlert(`New ${data.priority} complaint from ${data.student_name}: ${data.subject}`);
  refreshComplaintsTable();
});

HostilerzSocket.on("dataUpdated", (data) => {
  switch (data.type) {
    case "student_added":
    case "student_updated":
    case "student_removed":
      refreshStudentsTable(); break;
    case "gatepass_approved":
      refreshGatePassTable(); break;
    case "fees_generated":
      refreshFeesTable(); break;
    case "attendance_marked":
      refreshAttendanceView(); break;
  }
});

// ── WARDEN PANEL ─────────────────────────────────────────────
HostilerzSocket.connect(token, "warden", { block: "A" });

HostilerzSocket.on("newGatePassRequest", (data) => {
  // data: { gate_pass_id, student_name, roll_no, destination, departure_time, return_time }
  addGatePassRow(data);
  playNotificationSound();
});
*/
