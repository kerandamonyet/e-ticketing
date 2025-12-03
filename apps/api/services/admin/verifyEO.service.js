const prisma = require("../../../../packages/db");

module.exports = {
  // ============================
  // GET PENDING VERIFICATIONS
  // ============================
  getPendingEO: async (req, res) => {
    try {
      const data = await prisma.eoVerification.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getPendingEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // GET APPROVED EO (LIST EO)
  // ============================
  getApprovedEO: async (req, res) => {
    try {
      const data = await prisma.eO.findMany({
        include: { owner: true },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getApprovedEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // GET REJECTED VERIFICATIONS
  // ============================
  getRejectedEO: async (req, res) => {
    try {
      const data = await prisma.eoVerification.findMany({
        where: { status: "REJECTED" },
        include: { user: true },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getRejectedEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // GET ALL EO (ACTIVE)
  // ============================
  getAllEO: async (req, res) => {
    try {
      const data = await prisma.eO.findMany({
        include: { owner: true },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getAllEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // GET VERIFICATION DETAIL
  // ============================
  getEODetail: async (req, res) => {
    try {
      const data = await prisma.eoVerification.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Data tidak ditemukan" });

      res.json({ success: true, data });
    } catch (error) {
      console.error("getEODetail error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // APPROVE EO
  // ============================
  approveEO: async (req, res) => {
    try {
      const id = req.params.id;

      // Ambil verifikasi EO
      const verification = await prisma.eoVerification.findUnique({
        where: { id },
      });

      if (!verification)
        return res
          .status(404)
          .json({ success: false, message: "Verifikasi tidak ditemukan" });

      // APPROVE VERIFIKASI
      const updatedVerification = await prisma.eoVerification.update({
        where: { id },
        data: { status: "APPROVED" },
      });

      // BUAT EO BARU
      const eo = await prisma.eO.create({
        data: {
          ownerId: verification.userId,
          name: verification.fullName,
        },
      });

      // UPDATE ROLE USER → EO
      await prisma.user.update({
        where: { id: verification.userId },
        data: { role: "EO" },
      });

      // TAMBAHKAN EO ADMIN TEAM
      await prisma.eOTeamMember.create({
        data: {
          eoId: eo.id,
          userId: verification.userId,
          role: "ADMIN",
        },
      });

      res.json({
        success: true,
        message: "EO berhasil disetujui",
        data: { verification: updatedVerification, eo },
      });
    } catch (error) {
      console.error("approveEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ============================
  // REJECT EO
  // ============================
  rejectEO: async (req, res) => {
    try {
      const id = req.params.id;

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({
          success: false,
          message: "Request body kosong atau tidak valid",
        });
      }

      const note = req.body.note || null;

      const updated = await prisma.eoVerification.update({
        where: { id },
        data: {
          status: "REJECTED",
          note,
        },
      });

      res.json({
        success: true,
        message: "Pengajuan EO ditolak",
        data: updated,
      });
    } catch (error) {
      console.error("rejectEO error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
