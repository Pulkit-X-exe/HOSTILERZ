// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const dbConfig = {
  dialect: "mysql",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
  dialectOptions: {
    // Required for many cloud providers like Railway/DigitalOcean
    ssl: process.env.DB_SSL === "true" ? {
      rejectUnauthorized: false
    } : false
  }
};

const sequelize = process.env.DATABASE_URL || process.env.MYSQL_URL
  ? new Sequelize(process.env.DATABASE_URL || process.env.MYSQL_URL, dbConfig)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 3306,
        ...dbConfig
      }
    );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected via Sequelize");

    // Standard for Railway/production: Skip heavy sync if requested
    if (process.env.SKIP_DB_SYNC === "true") {
      console.log("⏩ Skipping database schema synchronization (SKIP_DB_SYNC=true)");
      return;
    }

    // 1. Initial schema check (no structural changes yet)
    await sequelize.sync({ alter: false });
    console.log("✅ Table structures loaded");

    // 2. Data Migrations & Cleanup - Safe Bulk Update
    console.log("🔄 Starting Data Cleanup & Block Migration...");

    // Remove orphaned fees/fines that prevent foreign key enforcement
    await sequelize.query("DELETE FROM `fees` WHERE `student_id` NOT IN (SELECT `id` FROM `students`)").catch(() => {});
    await sequelize.query("DELETE FROM `fines` WHERE `student_id` NOT IN (SELECT `id` FROM `students`)").catch(() => {});

    // Bulk update Block C -> A and rename room_number (Safe SQL)
    await sequelize.query(`
      UPDATE rooms 
      SET room_number = REPLACE(room_number, 'C', 'A'), block = 'A' 
      WHERE block NOT IN ('A', 'B') OR room_number LIKE 'C%'
    `);
    
    // Fix users (wardens) with invalid blocks
    await sequelize.query("UPDATE `users` SET `block` = 'A' WHERE `block` NOT IN ('A', 'B')");

    // 3. ENUM & Column Migrations (Safe now that data is bulk-cleaned)
    await sequelize.query("ALTER TABLE `users` MODIFY `block` ENUM('A', 'B')").catch(e => console.log("Users block ENUM fix skipped:", e.message));
    await sequelize.query("ALTER TABLE `rooms` MODIFY `block` ENUM('A', 'B')").catch(e => console.log("Rooms block ENUM fix skipped:", e.message));
    
    // Column lifecycle management
    const [compCols] = await sequelize.query("SHOW COLUMNS FROM `complaints` LIKE 'block'");
    if (compCols.length === 0) {
      await sequelize.query("ALTER TABLE `complaints` ADD COLUMN `block` ENUM('A', 'B') DEFAULT NULL");
    }

    await sequelize.query("ALTER TABLE `complaints` MODIFY `category` ENUM('maintenance', 'food', 'security', 'cleanliness', 'cleaning', 'Housekeeping', 'electricity', 'water', 'internet', 'other')").catch(() => {});
    
    // Notifications sync
    const [notifCols] = await sequelize.query("SHOW COLUMNS FROM `notifications` LIKE 'status'");
    if (notifCols.length === 0) {
      await sequelize.query("ALTER TABLE `notifications` ADD COLUMN `status` ENUM('pending', 'paid') DEFAULT 'pending'");
    }
    const [notifFeeCols] = await sequelize.query("SHOW COLUMNS FROM `notifications` LIKE 'fee_id'");
    if (notifFeeCols.length === 0) {
      await sequelize.query("ALTER TABLE `notifications` ADD COLUMN `fee_id` INT NULL");
    }

    // Student Gender Sync
    const [studentGenderCols] = await sequelize.query("SHOW COLUMNS FROM `students` LIKE 'gender'");
    if (studentGenderCols.length === 0) {
      await sequelize.query("ALTER TABLE `students` ADD COLUMN `gender` ENUM('male', 'female', 'other') DEFAULT 'male' AFTER year");
    }

    // 4. Final Sync Pass - Finalizes foreign keys and columns
    // Using alter: true carefully to avoid index bloat
    await sequelize.sync({ alter: { drop: false } });
    console.log("✅ Database schema synchronized (+alter)");


    // 5. Post-migration data backfills
    await sequelize.query(`
      UPDATE complaints c 
      JOIN students s ON c.student_id = s.id 
      JOIN rooms r ON s.room_id = r.id 
      SET c.block = r.block 
      WHERE c.block IS NULL OR c.block = ''
    `).catch(() => {});

    await sequelize.query(`
      UPDATE students s
      JOIN rooms r ON s.room_id = r.id
      SET s.room_no = CONCAT(r.block, '-', r.room_number)
      WHERE s.room_no IS NULL OR s.room_no = ''
    `).catch(() => {});

    console.log("✅ All migrations and data cleanup completed successfully");
  } catch (err) {
    if (err.name === 'SequelizeDatabaseError' && err.message.includes('ECONNRESET')) {
      console.error("⚠️ Connection reset during migration. Retrying in 5 seconds...");
      return setTimeout(connectDB, 5000);
    }
    console.error("❌ Database Connection/Sync Error:", err.message);
    // Don't crash the server process — let connectDB fail in background
    console.log("⚠️ Server will start in UNCONNECTED mode. Check your DB config.");
  }
};

module.exports = { sequelize, connectDB };
