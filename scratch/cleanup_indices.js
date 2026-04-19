const { sequelize } = require('../config/database');

async function cleanup() {
  try {
    console.log("🔍 Checking indices on 'users' table...");
    const [indices] = await sequelize.query("SHOW INDEX FROM users");
    const toDrop = indices
      .map(i => i.Key_name)
      .filter(name => /(_\d+)$/.test(name)); // Matches names like roll_no_2, admin_id_3, etc.

    console.log(`🗑️ Found ${toDrop.length} duplicate indices to drop.`);

    for (const indexName of toDrop) {
      console.log(`   - Dropping index: ${indexName}`);
      await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``).catch(e => {
        console.error(`   ❌ Failed to drop index ${indexName}: ${e.message}`);
      });
    }

    console.log("✅ Cleanup complete. Indices are now back within limits.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  }
}

cleanup();
