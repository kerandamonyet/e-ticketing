const prisma = require("../../../../packages/db");

module.exports = {
  getCounts: async (req, res) => {
    try {
      const pendingEO = await prisma.eoVerification.count({
        where: { status: "PENDING" },
      });

      const users = await prisma.user.count();

      const activeEvents = await prisma.event.count({
        where: { status: "PUBLISHED" }, // Or whatever you define as “active”
      });

      return res.json({
        success: true,
        data: { pendingEO, users, activeEvents },
      });
    } catch (error) {
      console.error("notification count error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getDetails: async (req, res) => {
    try {
      const pendingEO = await prisma.eoVerification.findMany({
        where: { status: "pending" },
      });

      return res.json({ success: true, data: { pendingEO } });
    } catch (error) {
      console.error("notification details error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  testNotification: async (req, res) => {
    return res.json({ success: true, message: "Admin Notification OK" });
  },
};
