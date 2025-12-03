const prisma = require("../../../../packages/db");

module.exports = {
  // ============================
  // APPLY EO
  // ============================
  applyEO: async (req, res) => {
    try {
      const userId = req.user.id;

      const ktpImage = req.files?.ktpImage?.[0]?.filename;
      const selfieImage = req.files?.selfieImage?.[0]?.filename;

      // CEK APAKAH SUDAH APPLY
      const existing = await prisma.eoVerification.findUnique({
        where: { userId },
      });

      if (existing && existing.status !== "REJECTED") {
        return res.status(400).json({
          error: "Anda sudah mengajukan permintaan EO sebelumnya",
        });
      }

      // VALIDASI INPUT
      if (!req.body.fullName)
        return res.status(400).json({ message: "Nama lengkap wajib" });

      if (!req.body.nik)
        return res.status(400).json({ message: "Nomor KTP/NIK wajib" });

      if (!req.body.phone)
        return res.status(400).json({ message: "Nomor telepon wajib" });

      if (!req.body.address)
        return res.status(400).json({ message: "Alamat wajib" });

      if (!ktpImage || !selfieImage)
        return res
          .status(400)
          .json({ message: "Foto KTP dan foto selfie wajib dikirim" });

      // CEK JIKA ADA YANG SUDAH PAKAI NIK INI (kecuali diri sendiri)
      const nikUsed = await prisma.eoVerification.findFirst({
        where: {
          nikHash: req.body.nik,
          userId: { not: userId },
        },
      });

      if (nikUsed) {
        return res.status(400).json({
          error: "NIK sudah digunakan oleh pengguna lain",
        });
      }

      // CREATE ATAU UPDATE
      const verif = existing
        ? await prisma.eoVerification.update({
            where: { userId },
            data: {
              fullName: req.body.fullName,
              nik: req.body.nik,
              nikHash: req.body.nik,
              phone: req.body.phone,
              address: req.body.address,
              ktpImage,
              selfieImage,
              status: "PENDING",
            },
          })
        : await prisma.eoVerification.create({
            data: {
              userId,
              fullName: req.body.fullName,
              nik: req.body.nik,
              nikHash: req.body.nik,
              phone: req.body.phone,
              address: req.body.address,
              ktpImage,
              selfieImage,
              status: "PENDING",
            },
          });

      return res.json({
        success: true,
        message: "Pengajuan EO berhasil. Menunggu verifikasi admin.",
        data: verif,
      });
    } catch (error) {
      console.error("applyEO service error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // ============================
  // MY STATUS EO
  // ============================

  myStatus: async (req, res) => {
    try {
      const userId = req.user.id;

      const verif = await prisma.eoVerification.findUnique({
        where: { userId },
      });

      // User baru → belum pernah daftar EO
      if (!verif) {
        return res.json({
          success: true,
          applied: false,
          status: "NOT_APPLIED",
          data: null,
        });
      }

      return res.json({
        success: true,
        applied: true,
        status: verif.status, // PENDING / REJECTED / APPROVED
        data: verif,
      });
    } catch (error) {
      console.error("myStatus error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
