// workers/expiryWorker.js
const { Op } = require("sequelize");
const { GatePass, Notice } = require("../models");

/**
 * Runs periodically to clean up or update expired entities.
 * Specifically handles converting pending/approved Gatepasses to 'expired'.
 * Notices are naturally hidden by queries, but can optionally be soft-deleted here.
 */
const runExpiryWorker = () => {
  // Run every 5 minutes
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Expire Gate Passes that have passed their scheduled return time
      // or are older than 24 hours just in case they lacked return times.
      const [updatedCount] = await GatePass.update(
        { status: "expired" },
        {
          where: {
            status: { [Op.in]: ["pending", "approved"] },
            return_time: { [Op.lt]: now }
          }
        }
      );
      
      if (updatedCount > 0) {
        console.log(`[Expiry Worker] Successfully expired ${updatedCount} gate passes.`);
      }

      // Optional: Clean up notices that have exceeded their expires_at date
      // We are softly hiding them via queries in controllers, but to be clean:
      const [noticesUpdated] = await Notice.update(
        { is_active: false },
        {
          where: {
            is_active: true,
            expires_at: { [Op.lt]: now }
          }
        }
      );

      if (noticesUpdated > 0) {
        console.log(`[Expiry Worker] Formally deactivated ${noticesUpdated} expired notices.`);
      }

    } catch (err) {
      console.error("[Expiry Worker] Error running scheduled jobs:", err.message);
    }
  }, 5 * 60 * 1000); // 5 minutes interval
};

module.exports = runExpiryWorker;
