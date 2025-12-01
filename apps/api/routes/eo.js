const express = require("express");
const router = express.Router();
const prisma = require("../../../packages/db");
const auth = require("../middleware/auth");
const { eoValidator } = require("../validators/eoValidator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Pastikan folder uploads/eo ada
const uploadDir = "uploads/eo";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Konfigurasi tempat simpan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// ✅ Filter file
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error("Format file tidak diizinkan. Hanya JPG, JPEG, PNG"),
      false
    );
  }
  cb(null, true);
};

// ✅ Konfigurasi multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter,
});

// ✅ USER submit EO
router.post(
  "/apply",
  auth,
  upload.fields([
    { name: "ktpImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1️⃣ Validasi file terlebih dahulu
      if (!req.files || !req.files.ktpImage || !req.files.selfieImage) {
        console.error("FILES MISSING:", {
          hasFiles: !!req.files,
          hasKtp: !!(req.files && req.files.ktpImage),
          hasSelfie: !!(req.files && req.files.selfieImage),
        });
        return res.status(400).json({
          error: "Foto KTP dan selfie wajib diunggah",
          received: {
            files: req.files ? Object.keys(req.files) : [],
            body: Object.keys(req.body),
          },
        });
      }

      // 2️⃣ Ambil body
      const body = {
        fullName: req.body.fullName,
        nik: req.body.nik,
        phone: req.body.phone,
        address: req.body.address,
      };

      // 3️⃣ Validasi body
      const { error, value } = eoValidator.validate(body);
      if (error) {
        // Hapus file yang sudah terupload jika validasi gagal
        if (req.files.ktpImage) fs.unlinkSync(req.files.ktpImage[0].path);
        if (req.files.selfieImage) fs.unlinkSync(req.files.selfieImage[0].path);

        return res.status(400).json({
          error: "Input tidak valid",
          details: error.details.map((x) => x.message),
        });
      }

      // 4️⃣ Ambil data dari value
      const { fullName, nik, phone, address } = value;

      // 5️⃣ Cek user sudah pernah daftar
      const existing = await prisma.eoVerification.findUnique({
        where: { userId: req.user.id },
      });

      if (existing) {
        // Hapus file yang baru diupload
        if (req.files.ktpImage) fs.unlinkSync(req.files.ktpImage[0].path);
        if (req.files.selfieImage) fs.unlinkSync(req.files.selfieImage[0].path);

        // Cek status existing
        if (existing.status === "PENDING") {
          return res.status(403).json({
            error: "Pengajuan EO sedang dalam proses verifikasi",
          });
        } else if (existing.status === "APPROVED") {
          return res.status(409).json({
            error: "Anda sudah terdaftar sebagai EO",
          });
        }
        // Jika REJECTED, bisa update (lanjut ke bawah)
      }

      // 6️⃣ Ambil path file
      const ktpImage = req.files.ktpImage[0].path;
      const selfieImage = req.files.selfieImage[0].path;

      // 7️⃣ FIX NIK DUPLICATION CHECK
      const allVerifications = await prisma.eoVerification.findMany({
        where: {
          userId: { not: req.user.id },
        },
        select: { nikHash: true },
      });

      for (const row of allVerifications) {
        const same = await bcrypt.compare(nik, row.nikHash);
        if (same) {
          // Hapus file yang baru diupload
          fs.unlinkSync(ktpImage);
          fs.unlinkSync(selfieImage);

          return res.status(409).json({ error: "NIK sudah digunakan" });
        }
      }

      // 8️⃣ Hash NIK
      const nikHash = await bcrypt.hash(nik, 10);

      // 9️⃣ Simpan atau update data
      let data;
      if (existing && existing.status === "REJECTED") {
        // Update jika sebelumnya ditolak
        // Hapus file lama
        if (existing.ktpImage && fs.existsSync(existing.ktpImage)) {
          fs.unlinkSync(existing.ktpImage);
        }
        if (existing.selfieImage && fs.existsSync(existing.selfieImage)) {
          fs.unlinkSync(existing.selfieImage);
        }

        data = await prisma.eoVerification.update({
          where: { userId: req.user.id },
          data: {
            fullName,
            nik, // ✅ TAMBAHKAN INI
            nikHash,
            phone,
            address,
            ktpImage,
            selfieImage,
            status: "PENDING",
            note: null,
          },
        });
      } else {
        // Create baru
        data = await prisma.eoVerification.create({
          data: {
            userId: req.user.id,
            fullName,
            nik, // ✅ TAMBAHKAN INI - field wajib di schema
            nikHash,
            phone,
            address,
            ktpImage,
            selfieImage,
          },
        });
      }

      res.json({
        message: "Pengajuan EO berhasil. Menunggu verifikasi admin.",
        data: {
          id: data.id,
          status: data.status,
          createdAt: data.createdAt,
        },
      });
    } catch (error) {
      console.error("❌ EO APPLY ERROR:", error);

      // Hapus file jika ada error
      try {
        if (req.files?.ktpImage) fs.unlinkSync(req.files.ktpImage[0].path);
        if (req.files?.selfieImage)
          fs.unlinkSync(req.files.selfieImage[0].path);
      } catch (unlinkError) {
        console.error("Error deleting files:", unlinkError);
      }

      res.status(500).json({
        error: "Terjadi kesalahan server",
        message: error.message,
      });
    }
  }
);

// USER update form
router.put(
  "/update",
  auth,
  upload.fields([
    { name: "ktpImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const eo = await prisma.eoVerification.findUnique({
        where: { userId: req.user.id },
      });

      if (!eo) {
        return res.status(404).json({ error: "Belum pernah daftar EO" });
      }

      if (eo.status !== "REJECTED") {
        return res.status(403).json({
          error: "Hanya bisa edit jika status REJECTED",
        });
      }

      const body = {
        fullName: req.body.fullName || eo.fullName,
        nik: req.body.nik,
        phone: req.body.phone || eo.phone,
        address: req.body.address || eo.address,
      };

      // Validasi jika ada perubahan
      if (
        req.body.fullName ||
        req.body.nik ||
        req.body.phone ||
        req.body.address
      ) {
        const { error, value } = eoValidator.validate(body);
        if (error) {
          return res.status(400).json({
            error: "Input tidak valid",
            details: error.details.map((x) => x.message),
          });
        }
      }

      const updateData = {
        status: "PENDING",
        note: null,
      };

      if (req.body.fullName) updateData.fullName = req.body.fullName;
      if (req.body.phone) updateData.phone = req.body.phone;
      if (req.body.address) updateData.address = req.body.address;

      if (req.body.nik) {
        updateData.nik = req.body.nik; // ✅ TAMBAHKAN INI
        updateData.nikHash = await bcrypt.hash(req.body.nik, 10);
      }

      // Update file jika ada
      if (req.files?.ktpImage) {
        if (eo.ktpImage && fs.existsSync(eo.ktpImage)) {
          fs.unlinkSync(eo.ktpImage);
        }
        updateData.ktpImage = req.files.ktpImage[0].path;
      }

      if (req.files?.selfieImage) {
        if (eo.selfieImage && fs.existsSync(eo.selfieImage)) {
          fs.unlinkSync(eo.selfieImage);
        }
        updateData.selfieImage = req.files.selfieImage[0].path;
      }

      const updated = await prisma.eoVerification.update({
        where: { userId: req.user.id },
        data: updateData,
      });

      res.json({
        message: "Data EO berhasil diperbarui",
        data: {
          id: updated.id,
          status: updated.status,
        },
      });
    } catch (error) {
      console.error("EO UPDATE ERROR:", error);
      res.status(500).json({
        error: "Terjadi kesalahan server",
        message: error.message,
      });
    }
  }
);

// GET status EO
router.get("/my-status", auth, async (req, res) => {
  try {
    const eo = await prisma.eoVerification.findUnique({
      where: { userId: req.user.id },
      select: {
        status: true,
        note: true,
        fullName: true,
        nik: true,
        phone: true,
        address: true,
        ktpImage: true,
        selfieImage: true,
      },
    });

    if (!eo) {
      return res.json({
        status: "NOT_REGISTERED",
      });
    }

    if (eo.status === "REJECTED") {
      return res.json({
        status: eo.status,
        note: eo.note,
        form: {
          fullName: eo.fullName,
          nik: eo.nik,
          phone: eo.phone,
          address: eo.address,
        },
      });
    }

    res.json({
      status: eo.status,
      note: eo.note || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal cek status EO" });
  }
});

module.exports = router;
