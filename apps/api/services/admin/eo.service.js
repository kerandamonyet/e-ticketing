const prisma = require("../../../../packages/db");

module.exports = {
  getPendingEO: async (req, res) => {
    try {
      const data = await prisma.eoVerification.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getPendingEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getApprovedEO: async (req, res) => {
    try {
      const data = await prisma.eO.findMany({ where: { status: "approved" } });
      res.json({ success: true, data });
    } catch (error) {
      console.error("getApprovedEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getRejectedEO: async (req, res) => {
    try {
      const data = await prisma.eO.findMany({ where: { status: "rejected" } });
      res.json({ success: true, data });
    } catch (error) {
      console.error("getRejectedEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getAllEO: async (req, res) => {
    try {
      const data = await prisma.eO.findMany();
      res.json({ success: true, data });
    } catch (error) {
      console.error("getAllEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getEODetail: async (req, res) => {
    try {
      const data = await prisma.eO.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!data) {
        return res
          .status(404)
          .json({ success: false, message: "Data EO tidak ditemukan" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("getEODetail error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  approveEO: async (req, res) => {
    try {
      const updated = await prisma.eO.update({
        where: { id: req.params.id },
        data: { status: "approved" },
      });

      res.json({ success: true, message: "EO disetujui", data: updated });
    } catch (error) {
      console.error("approveEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  rejectEO: async (req, res) => {
    try {
      const updated = await prisma.eO.update({
        where: { id: req.params.id },
        data: { status: "rejected" },
      });

      res.json({ success: true, message: "EO ditolak", data: updated });
    } catch (error) {
      console.error("rejectEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
