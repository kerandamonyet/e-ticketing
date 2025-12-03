const prisma = require("../../../../packages/db");

module.exports = {
  getAdminAuditLogs: async (req, res) => {
    try {
      const logs = await prisma.adminAudit.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      return res.json({ success: true, data: logs });
    } catch (error) {
      console.error("admin audit log error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
