const { Student } = require('./models');
const { connectDB } = require('./config/database');

async function check() {
  try {
    await connectDB(); // Sync schema and apply migrations
    const students = await Student.findAll({ limit: 10 });
    console.log('Students room_no data:');
    students.forEach(s => {
      console.log(`- ${s.name} (Roll: ${s.roll_no}): ${s.room_no || 'Unassigned'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err.message);
    process.exit(1);
  }
}

check();
