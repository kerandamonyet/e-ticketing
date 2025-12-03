const express = require("express");
const router = express.Router();
const prisma = require("../../../../packages/db");
const auth = require("../../middleware/userAuth");
const { eoValidator } = require("../../validators/eo/eo.validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const eoAuth = require("../../middleware/eoAuth");
const eoAdmin = require("../../middleware/eoAdmin");

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

// ============ BECOME EO ============
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

// ======== EVENT MANAGEMENT =========

// CREATE EVENT
router.post("/event/create", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { title, description, startDate, endDate, type, timezone } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "Field wajib diisi" });
    }

    const event = await prisma.event.create({
      data: {
        eoId: req.eo.id,
        title,
        description: description || null,
        type: type || "OFFLINE",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        timezone: timezone || "Asia/Jakarta",
      },
    });

    return res.json({
      success: true,
      message: "Event berhasil dibuat",
      data: event,
    });
  } catch (err) {
    console.error("CREATE EVENT ERROR:", err);
    return res.status(500).json({ error: "Gagal membuat event" });
  }
});

// LIST ALL EVENTS (ADMIN = all, SCANNER = only accessible)
router.get("/events", eoAuth, async (req, res) => {
  try {
    const team = await prisma.eOTeamMember.findFirst({
      where: { userId: req.user.id },
      select: {
        eoId: true,
        role: true,
        accesses: { select: { eventId: true } },
      },
    });

    if (!team) return res.status(403).json({ error: "Bukan tim EO" });

    const where = { eoId: team.eoId, deletedAt: null };

    if (team.role === "SCANNER") {
      where.id = { in: team.accesses.map((a) => a.eventId) };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: events });
  } catch (err) {
    console.error("LIST EVENT ERROR:", err);
    return res.status(500).json({ error: "Gagal load event" });
  }
});

// UPDATE EVENT (HANYA EO ADMIN PEMILIK EVENT)
router.put("/event/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) return res.status(404).json({ error: "Event tidak ditemukan" });
    if (event.eoId !== req.eo.id)
      return res.status(403).json({ error: "Tidak memiliki akses" });

    const disallowed = ["id", "eoId", "createdAt", "updatedAt", "deletedAt"];
    for (const f of disallowed) delete req.body[f];

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: req.body,
    });

    return res.json({
      success: true,
      message: "Event berhasil diupdate",
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    return res.status(500).json({ error: "Gagal update event" });
  }
});

// SOFT DELETE EVENT
router.delete("/event/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) return res.status(404).json({ error: "Event tidak ditemukan" });
    if (event.eoId !== req.eo.id)
      return res.status(403).json({ error: "Tidak memiliki akses" });

    await prisma.event.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    return res.json({
      success: true,
      message: "Event dinonaktifkan",
    });
  } catch (err) {
    console.error("DELETE EVENT ERROR:", err);
    return res.status(500).json({ error: "Gagal hapus event" });
  }
});

// UPDATE EVENT STATUS
router.patch("/event/:id/status", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["DRAFT", "PUBLISHED", "FINISHED", "CANCELLED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Status tidak valid" });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) return res.status(404).json({ error: "Event tidak ditemukan" });
    if (event.eoId !== req.eo.id)
      return res.status(403).json({ error: "Tidak memiliki akses" });

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    return res.status(500).json({ error: "Gagal mengubah status event" });
  }
});

//
// TICKET TYPE CRUD
//

// Create ticket type
router.post(
  "/event/:eventId/ticket-type",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { name, price, quota } = req.body;

      if (!name || price == null) {
        return res.status(400).json({ error: "name dan price wajib diisi" });
      }

      // check event ownership
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.eoId !== req.eo.id) {
        return res
          .status(404)
          .json({ error: "Event tidak ditemukan atau bukan milik EO" });
      }

      const ticketType = await prisma.ticketType.create({
        data: {
          eventId,
          name,
          price: Number(price),
          quota: quota != null ? Number(quota) : null,
        },
      });

      return res.json({ success: true, data: ticketType });
    } catch (err) {
      console.error("CREATE TICKET TYPE ERROR:", err);
      return res.status(500).json({ error: "Gagal membuat ticket type" });
    }
  }
);

// List ticket types for event
router.get("/event/:eventId/ticket-types", eoAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // only allow EO owner or public reading? here we allow EO members
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Event tidak ditemukan atau bukan milik EO" });
    }

    const types = await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: { presales: true },
    });

    return res.json({ success: true, data: types });
  } catch (err) {
    console.error("LIST TICKET TYPES ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil ticket types" });
  }
});

// Get single ticket type
router.get("/event/:eventId/ticket-type/:id", eoAuth, async (req, res) => {
  try {
    const { eventId, id } = req.params;
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: { presales: true },
    });
    if (!ticketType || ticketType.eventId !== eventId) {
      return res.status(404).json({ error: "Ticket type tidak ditemukan" });
    }
    // owner check
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id) {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    return res.json({ success: true, data: ticketType });
  } catch (err) {
    console.error("GET TICKET TYPE ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil ticket type" });
  }
});

// Update ticket type
router.put(
  "/event/:eventId/ticket-type/:id",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { eventId, id } = req.params;
      const { name, price, quota } = req.body;

      const ticketType = await prisma.ticketType.findUnique({ where: { id } });
      if (!ticketType || ticketType.eventId !== eventId) {
        return res.status(404).json({ error: "Ticket type tidak ditemukan" });
      }
      // event ownership validated by eoAdmin middleware already

      const updated = await prisma.ticketType.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(price !== undefined && { price: Number(price) }),
          ...(quota !== undefined && {
            quota: quota !== null ? Number(quota) : null,
          }),
        },
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error("UPDATE TICKET TYPE ERROR:", err);
      return res.status(500).json({ error: "Gagal update ticket type" });
    }
  }
);

// Delete ticket type
router.delete(
  "/event/:eventId/ticket-type/:id",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { eventId, id } = req.params;

      const ticketType = await prisma.ticketType.findUnique({ where: { id } });
      if (!ticketType || ticketType.eventId !== eventId) {
        return res.status(404).json({ error: "Ticket type tidak ditemukan" });
      }

      // Option: check if there are sold tickets -> prevent deletion if exists
      const soldCount = await prisma.ticket.count({
        where: { ticketTypeId: id },
      });
      if (soldCount > 0) {
        return res.status(400).json({
          error:
            "Tidak dapat menghapus ticket type yang sudah memiliki tiket terbit",
        });
      }

      await prisma.ticketType.delete({ where: { id } });
      return res.json({ success: true, message: "Ticket type dihapus" });
    } catch (err) {
      console.error("DELETE TICKET TYPE ERROR:", err);
      return res.status(500).json({ error: "Gagal menghapus ticket type" });
    }
  }
);

//
// PRESALE TIERS (nested under TicketType)
//

// Create presale
router.post(
  "/ticket-type/:ticketTypeId/presale",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { ticketTypeId } = req.params;
      const { tierName, price, quota, startDate, endDate } = req.body;

      if (!tierName || price == null) {
        return res
          .status(400)
          .json({ error: "tierName dan price wajib diisi" });
      }

      const tt = await prisma.ticketType.findUnique({
        where: { id: ticketTypeId },
        include: { event: true },
      });
      if (!tt || tt.event.eoId !== req.eo.id) {
        return res
          .status(404)
          .json({ error: "Ticket type tidak ditemukan atau bukan milik EO" });
      }

      const presale = await prisma.presale.create({
        data: {
          ticketTypeId,
          tierName,
          price: Number(price),
          quota: quota != null ? Number(quota) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      return res.json({ success: true, data: presale });
    } catch (err) {
      console.error("CREATE PRESALE ERROR:", err);
      return res.status(500).json({ error: "Gagal membuat presale" });
    }
  }
);

// List presales for ticket type
router.get("/ticket-type/:ticketTypeId/presales", eoAuth, async (req, res) => {
  try {
    const { ticketTypeId } = req.params;
    const tt = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { event: true },
    });
    if (!tt || tt.event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Ticket type tidak ditemukan atau bukan milik EO" });
    }

    const presales = await prisma.presale.findMany({
      where: { ticketTypeId },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: presales });
  } catch (err) {
    console.error("LIST PRESALES ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil presales" });
  }
});

// Update presale
router.put("/presale/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tierName, price, quota, startDate, endDate } = req.body;

    const presale = await prisma.presale.findUnique({
      where: { id },
      include: { ticketType: { include: { event: true } } },
    });
    if (!presale || presale.ticketType.event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Presale tidak ditemukan atau bukan milik EO" });
    }

    const updated = await prisma.presale.update({
      where: { id },
      data: {
        ...(tierName !== undefined && { tierName }),
        ...(price !== undefined && { price: Number(price) }),
        ...(quota !== undefined && {
          quota: quota !== null ? Number(quota) : null,
        }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("UPDATE PRESALE ERROR:", err);
    return res.status(500).json({ error: "Gagal update presale" });
  }
});

// Delete presale
router.delete("/presale/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const presale = await prisma.presale.findUnique({
      where: { id },
      include: { ticketType: { include: { event: true } } },
    });
    if (!presale || presale.ticketType.event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Presale tidak ditemukan atau bukan milik EO" });
    }

    await prisma.presale.delete({ where: { id } });
    return res.json({ success: true, message: "Presale dihapus" });
  } catch (err) {
    console.error("DELETE PRESALE ERROR:", err);
    return res.status(500).json({ error: "Gagal menghapus presale" });
  }
});

//
// PROMO (Kode promo, attach ticket types, allowed users)
//

// Create promo
router.post("/event/:eventId/promo", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      code,
      name,
      description,
      discountType, // "PERCENT" | "AMOUNT"
      discountValue,
      quota,
      validFrom,
      validUntil,
      isActive,
    } = req.body;

    if (!name || discountType == null || discountValue == null) {
      return res
        .status(400)
        .json({ error: "name, discountType, discountValue wajib diisi" });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Event tidak ditemukan atau bukan milik EO" });
    }

    const promo = await prisma.promo.create({
      data: {
        eventId,
        code: code || null,
        name,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        quota: quota != null ? Number(quota) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive == null ? true : Boolean(isActive),
      },
    });

    return res.json({ success: true, data: promo });
  } catch (err) {
    console.error("CREATE PROMO ERROR:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Kode promo sudah digunakan" });
    }
    return res.status(500).json({ error: "Gagal membuat promo" });
  }
});

// List promos for event
router.get("/event/:eventId/promos", eoAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id) {
      return res
        .status(404)
        .json({ error: "Event tidak ditemukan atau bukan milik EO" });
    }

    const promos = await prisma.promo.findMany({
      where: { eventId },
      include: {
        ticketTypes: { include: { ticketType: true } },
        allowedUsers: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: promos });
  } catch (err) {
    console.error("LIST PROMOS ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil promos" });
  }
});

// Get promo
router.get("/promo/:id", eoAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promo = await prisma.promo.findUnique({
      where: { id },
      include: { ticketTypes: true, allowedUsers: true, event: true },
    });
    if (!promo || promo.event.eoId !== req.eo.id) {
      return res.status(404).json({ error: "Promo tidak ditemukan" });
    }
    return res.json({ success: true, data: promo });
  } catch (err) {
    console.error("GET PROMO ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil promo" });
  }
});

// Update promo
router.put("/promo/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promo = await prisma.promo.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!promo || promo.event.eoId !== req.eo.id) {
      return res.status(404).json({ error: "Promo tidak ditemukan" });
    }

    const updated = await prisma.promo.update({
      where: { id },
      data: {
        ...(updates.code !== undefined && { code: updates.code || null }),
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && {
          description: updates.description || null,
        }),
        ...(updates.discountType !== undefined && {
          discountType: updates.discountType,
        }),
        ...(updates.discountValue !== undefined && {
          discountValue: Number(updates.discountValue),
        }),
        ...(updates.quota !== undefined && {
          quota: updates.quota !== null ? Number(updates.quota) : null,
        }),
        ...(updates.validFrom !== undefined && {
          validFrom: updates.validFrom ? new Date(updates.validFrom) : null,
        }),
        ...(updates.validUntil !== undefined && {
          validUntil: updates.validUntil ? new Date(updates.validUntil) : null,
        }),
        ...(updates.isActive !== undefined && {
          isActive: Boolean(updates.isActive),
        }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("UPDATE PROMO ERROR:", err);
    return res.status(500).json({ error: "Gagal update promo" });
  }
});

// Delete promo
router.delete("/promo/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const promo = await prisma.promo.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!promo || promo.event.eoId !== req.eo.id) {
      return res.status(404).json({ error: "Promo tidak ditemukan" });
    }

    await prisma.$transaction([
      prisma.promoTicketType.deleteMany({ where: { promoId: id } }),
      prisma.promoUser.deleteMany({ where: { promoId: id } }),
      prisma.promo.delete({ where: { id } }),
    ]);

    return res.json({ success: true, message: "Promo dihapus" });
  } catch (err) {
    console.error("DELETE PROMO ERROR:", err);
    return res.status(500).json({ error: "Gagal menghapus promo" });
  }
});

// Attach ticket types to promo (body: { ticketTypeIds: [...] })
router.post("/promo/:id/ticket-types", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ticketTypeIds } = req.body;
    if (!Array.isArray(ticketTypeIds) || ticketTypeIds.length === 0) {
      return res
        .status(400)
        .json({ error: "ticketTypeIds harus array dan tidak kosong" });
    }

    const promo = await prisma.promo.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!promo || promo.event.eoId !== req.eo.id) {
      return res.status(404).json({ error: "Promo tidak ditemukan" });
    }

    // validate ticket types belong to same event
    const tts = await prisma.ticketType.findMany({
      where: { id: { in: ticketTypeIds } },
      include: { event: true },
    });
    if (tts.length !== ticketTypeIds.length) {
      return res
        .status(400)
        .json({ error: "Salah satu ticketTypeId tidak ditemukan" });
    }
    if (
      tts.some((t) => t.event.eoId !== req.eo.id || t.eventId !== promo.eventId)
    ) {
      return res
        .status(400)
        .json({ error: "Semua ticket type harus milik event yang sama" });
    }

    // create relations (ignore duplicates)
    const ops = ticketTypeIds.map((tid) =>
      prisma.promoTicketType.upsert({
        where: { promoId_ticketTypeId: { promoId: id, ticketTypeId: tid } },
        update: {},
        create: { promoId: id, ticketTypeId: tid },
      })
    );

    await prisma.$transaction(ops);

    const updated = await prisma.promo.findUnique({
      where: { id },
      include: { ticketTypes: { include: { ticketType: true } } },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("ATTACH PROMO TICKET TYPES ERROR:", err);
    return res
      .status(500)
      .json({ error: "Gagal attach ticket types ke promo" });
  }
});

// Remove ticket type from promo
router.delete(
  "/promo/:id/ticket-types/:ticketTypeId",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { id, ticketTypeId } = req.params;
      const promo = await prisma.promo.findUnique({
        where: { id },
        include: { event: true },
      });
      if (!promo || promo.event.eoId !== req.eo.id) {
        return res.status(404).json({ error: "Promo tidak ditemukan" });
      }
      await prisma.promoTicketType.deleteMany({
        where: { promoId: id, ticketTypeId },
      });
      return res.json({ success: true, message: "Dilepas dari promo" });
    } catch (err) {
      console.error("DETACH PROMO TICKET TYPE ERROR:", err);
      return res
        .status(500)
        .json({ error: "Gagal melepas ticket type dari promo" });
    }
  }
);

// Allow specific user to use promo (body: { userId })
router.post("/promo/:id/allow-user", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId wajib diisi" });

    const promo = await prisma.promo.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!promo || promo.event.eoId !== req.eo.id) {
      return res.status(404).json({ error: "Promo tidak ditemukan" });
    }

    await prisma.promoUser.create({ data: { promoId: id, userId } });
    return res.json({
      success: true,
      message: "User diizinkan menggunakan promo",
    });
  } catch (err) {
    console.error("ALLOW PROMO USER ERROR:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "User sudah diizinkan sebelumnya" });
    }
    return res.status(500).json({ error: "Gagal menambahkan user ke promo" });
  }
});

// Remove allowed user
router.delete(
  "/promo/:id/allow-user/:userId",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { id, userId } = req.params;
      const promo = await prisma.promo.findUnique({
        where: { id },
        include: { event: true },
      });
      if (!promo || promo.event.eoId !== req.eo.id) {
        return res.status(404).json({ error: "Promo tidak ditemukan" });
      }
      await prisma.promoUser.deleteMany({ where: { promoId: id, userId } });
      return res.json({
        success: true,
        message: "User dihapus dari daftar promo",
      });
    } catch (err) {
      console.error("REMOVE PROMO USER ERROR:", err);
      return res.status(500).json({ error: "Gagal menghapus user dari promo" });
    }
  }
);

//
// EVENT LOCATION & ONLINE LINKS
//

// Create location
router.post("/event/:eventId/location", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { label, address, mapLink } = req.body;
    if (!label) return res.status(400).json({ error: "label wajib diisi" });

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Event tidak ditemukan" });

    const loc = await prisma.eventLocation.create({
      data: {
        eventId,
        label,
        address: address || null,
        mapLink: mapLink || null,
      },
    });

    return res.json({ success: true, data: loc });
  } catch (err) {
    console.error("CREATE LOCATION ERROR:", err);
    return res.status(500).json({ error: "Gagal membuat location" });
  }
});

// List locations
router.get("/event/:eventId/locations", eoAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Event tidak ditemukan" });

    const locs = await prisma.eventLocation.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: locs });
  } catch (err) {
    console.error("LIST LOCATIONS ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil locations" });
  }
});

// Update location
router.put("/location/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, mapLink } = req.body;
    const loc = await prisma.eventLocation.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!loc || loc.event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Location tidak ditemukan" });

    const updated = await prisma.eventLocation.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(address !== undefined && { address: address || null }),
        ...(mapLink !== undefined && { mapLink: mapLink || null }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("UPDATE LOCATION ERROR:", err);
    return res.status(500).json({ error: "Gagal update location" });
  }
});

// Delete location
router.delete("/location/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const loc = await prisma.eventLocation.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!loc || loc.event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Location tidak ditemukan" });

    await prisma.eventLocation.delete({ where: { id } });
    return res.json({ success: true, message: "Location dihapus" });
  } catch (err) {
    console.error("DELETE LOCATION ERROR:", err);
    return res.status(500).json({ error: "Gagal menghapus location" });
  }
});

// Create online link
router.post(
  "/event/:eventId/online-link",
  eoAuth,
  eoAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { platform, url } = req.body;
      if (!platform || !url)
        return res.status(400).json({ error: "platform dan url wajib diisi" });

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event || event.eoId !== req.eo.id)
        return res.status(404).json({ error: "Event tidak ditemukan" });

      const link = await prisma.eventOnlineLink.create({
        data: { eventId, platform, url },
      });

      return res.json({ success: true, data: link });
    } catch (err) {
      console.error("CREATE ONLINE LINK ERROR:", err);
      return res.status(500).json({ error: "Gagal membuat online link" });
    }
  }
);

// List online links
router.get("/event/:eventId/online-links", eoAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Event tidak ditemukan" });

    const links = await prisma.eventOnlineLink.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: links });
  } catch (err) {
    console.error("LIST ONLINE LINKS ERROR:", err);
    return res.status(500).json({ error: "Gagal mengambil online links" });
  }
});

// Update online link
router.put("/online-link/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, url } = req.body;
    const link = await prisma.eventOnlineLink.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!link || link.event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Online link tidak ditemukan" });

    const updated = await prisma.eventOnlineLink.update({
      where: { id },
      data: {
        ...(platform !== undefined && { platform }),
        ...(url !== undefined && { url }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("UPDATE ONLINE LINK ERROR:", err);
    return res.status(500).json({ error: "Gagal update online link" });
  }
});

// Delete online link
router.delete("/online-link/:id", eoAuth, eoAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const link = await prisma.eventOnlineLink.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!link || link.event.eoId !== req.eo.id)
      return res.status(404).json({ error: "Online link tidak ditemukan" });

    await prisma.eventOnlineLink.delete({ where: { id } });
    return res.json({ success: true, message: "Online link dihapus" });
  } catch (err) {
    console.error("DELETE ONLINE LINK ERROR:", err);
    return res.status(500).json({ error: "Gagal menghapus online link" });
  }
});

//
// SCANNER CHECK-IN
// Body: { code: "TICKETCODE" }
// Requires: req.eo (EO) and req.user
//

router.post("/event/:eventId/scan", eoAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code wajib diisi" });

    // check team member role (scanner or admin) - find EOTeamMember by eoId + userId
    const member = await prisma.eOTeamMember.findUnique({
      where: { eoId_userId: { eoId: req.eo.id, userId: req.user.id } },
    });

    if (!member || (member.role !== "SCANNER" && member.role !== "ADMIN")) {
      return res.status(403).json({
        error: "Hanya anggota EO (role SCANNER/ADMIN) yang boleh scan",
      });
    }

    // find ticket by code, include ticketType->event
    const ticket = await prisma.ticket.findUnique({
      where: { code },
      include: { ticketType: { include: { event: true } } },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Tiket tidak ditemukan" });
    }

    // ensure ticket belongs to this event
    if (!ticket.ticketType || ticket.ticketType.eventId !== eventId) {
      return res.status(400).json({ error: "Tiket tidak untuk event ini" });
    }

    if (ticket.isUsed) {
      // create scan log with result "ALREADY_USED"
      const log = await prisma.scanLog.create({
        data: {
          eventId,
          memberId: member.id,
          ticketId: ticket.id,
          result: "ALREADY_USED",
        },
      });
      return res
        .status(400)
        .json({ success: false, message: "Tiket sudah digunakan", data: log });
    }

    // mark ticket used and create scan log in transaction
    const [updatedTicket, scanLog] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { isUsed: true, eventId },
      }),
      prisma.scanLog.create({
        data: {
          eventId,
          memberId: member.id,
          ticketId: ticket.id,
          result: "OK",
        },
      }),
    ]);

    // Optionally, increment event.soldCount? scanning shouldn't increment soldCount — leave it
    // Return success
    return res.json({
      success: true,
      message: "Check-in berhasil",
      ticket: updatedTicket,
      scan: scanLog,
    });
  } catch (err) {
    console.error("SCAN ERROR:", err);
    return res.status(500).json({ error: "Gagal melakukan scan" });
  }
});
module.exports = router;
