const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../../packages/db");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const ExcelJS = require("exceljs");
const rateLimit = require("express-rate-limit");

// Middleware khusus admin
function onlyAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

// ==================== RATE LIMIT ====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Coba lagi nanti.",
  },
});

// ========== AUTH ROUTES =============

// LOGIN
router.post("/login", limiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    // Cari user dengan email (role harus ADMIN)
    const admin = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Email tidak ditemukan
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // Validasi role admin
    if (admin.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Bukan admin.",
      });
    }

    // Validasi status aktif
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun admin telah dinonaktifkan",
      });
    }

    // Bandingkan password
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // Buat token khusus admin
    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.role,
        email: admin.email,
      },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: "1d" }
    );

    // Kirim sebagai HttpOnly Cookie
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Hanya https waktu produksi
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login admin berhasil",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ME
router.get("/me", adminAuth, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.admin,
  });
});

// LOGOUT
router.post("/logout", limiter, (req, res) => {
  res.clearCookie("admin_token", {
    path: "/",
  });
  res.json({ success: true });
});

// ========== NOTIFICATIONS ROUTES ==========
// GET NOTIFICATIONS COUNT - Realtime notifications untuk navbar
router.get("/notifications", adminAuth, async (req, res) => {
  try {
    // Hitung jumlah EO yang pending
    const pendingEO = await prisma.eoVerification.count({
      where: { status: "PENDING" },
    });

    // Hitung jumlah withdrawal yang pending
    let pendingWithdrawals = 0;
    try {
      pendingWithdrawals = await prisma.withdrawal.count({
        where: { status: "PENDING" },
      });
    } catch (error) {}

    // Hitung jumlah order yang pending
    let pendingOrders = 0;
    try {
      pendingOrders = await prisma.order.count({
        where: { status: "PENDING" },
      });
    } catch (error) {}

    const total = pendingEO + pendingWithdrawals + pendingOrders;

    const responseData = {
      success: true,
      pendingEO,
      pendingWithdrawals,
      pendingOrders,
      total,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data notifikasi",
      error: error.message,
      pendingEO: 0,
      pendingWithdrawals: 0,
      pendingOrders: 0,
    });
  }
});

// GET NOTIFICATIONS DETAIL - Untuk detail notifikasi (opsional)
router.get("/notifications/details", adminAuth, async (req, res) => {
  try {
    // Data EO pending
    const pendingEOList = await prisma.eoVerification.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5, // Ambil 5 terakhir
    });

    // Data withdrawal pending
    let pendingWithdrawalsList = [];
    try {
      pendingWithdrawalsList = await prisma.withdrawal.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    } catch (error) {}

    // Data order pending
    let pendingOrdersList = [];
    try {
      pendingOrdersList = await prisma.order.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    } catch (error) {}

    return res.status(200).json({
      success: true,
      data: {
        pendingEO: {
          count: pendingEOList.length,
          items: pendingEOList,
        },
        pendingWithdrawals: {
          count: pendingWithdrawalsList.length,
          items: pendingWithdrawalsList,
        },
        pendingOrders: {
          count: pendingOrdersList.length,
          items: pendingOrdersList,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching notification details:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail notifikasi",
      error: error.message,
    });
  }
});

// TEST ENDPOINT - Untuk testing notifikasi (HAPUS di production)
router.get("/notifications/test", adminAuth, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API Notifications is working!",
    pendingEO: 5,
    pendingWithdrawals: 3,
    pendingOrders: 2,
    total: 10,
    timestamp: new Date().toISOString(),
  });
});

// ========== AUDIT LOGS ==========
// GET ADMIN AUDIT LOGS
router.get("/users/audit/logs", adminAuth, async (req, res) => {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: logs });
});

// ========== USER MANAGEMENT ===========
// GET ALL USER (admin only)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null, // soft delete filter
    };

    // Filter role
    if (role) where.role = role.toUpperCase();

    // Filter active
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil user" });
  }
});

// GET USER BY ID
router.get("/users/:id", adminAuth, async (req, res) => {
  try {
    const id = req.params.id; // STRING ✅

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        eoVerification: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil user" });
  }
});

// // UPDATE ROLE USER
// router.put("/users/:id/role", adminAuth, async (req, res) => {
//   try {
//     const { role } = req.body;
//     const id = req.params.id;

//     const roles = ["USER", "EO", "ADMIN"];
//     if (!roles.includes(role)) {
//       return res.status(400).json({ message: "Role tidak valid" });
//     }

//     const user = await prisma.user.update({
//       where: { id },
//       data: { role },
//     });

//     // Audit log
//     await prisma.adminAuditLog.create({
//       data: {
//         adminId: req.admin.id,
//         action: "UPDATE_ROLE",
//         targetId: id,
//         detail: `Change role to ${role}`,
//       },
//     });

//     res.json({ success: true, message: "Role berhasil diubah", data: user });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Gagal update role" });
//   }
// });

// AKTIF/NONAKTIFKAN USER
router.put("/users/:id/status", adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const id = req.params.id;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.admin.id,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        targetId: id,
        detail: `User ${isActive ? "activated" : "deactivated"}`,
      },
    });

    res.json({
      success: true,
      message: "Status user berhasil diubah",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal update status" });
  }
});

// DELETE USER
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const id = req.params.id;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.admin.id,
        action: "SOFT_DELETE_USER",
        targetId: id,
        detail: "User soft deleted",
      },
    });

    res.json({ success: true, message: "User berhasil dihapus (soft)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal hapus user" });
  }
});

// EXPORT EXCEL USER
router.get("/users-export", adminAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");

  sheet.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Active", key: "isActive", width: 10 },
    { header: "Created", key: "createdAt", width: 20 },
  ];

  sheet.addRows(users);

  res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

// ========== EO MANAGEMENT ==========
// GET EO PENDING - Konsisten menggunakan adminAuth
router.get("/eo/pending", adminAuth, async (req, res) => {
  try {
    const eo = await prisma.eoVerification.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    //  PERBAIKI URL GAMBAR
    const eoWithFixedUrls = eo.map((item) => ({
      ...item,
      ktpImage: item.ktpImage ? `http://localhost:4000${item.ktpImage}` : null,
      selfieImage: item.selfieImage
        ? `http://localhost:4000${item.selfieImage}`
        : null,
    }));

    return res.status(200).json({
      success: true,
      count: eoWithFixedUrls.length,
      data: eoWithFixedUrls,
    });
  } catch (error) {
    console.error("Error fetching pending EO:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data EO pending",
    });
  }
});

// GET EO APPROVED
router.get("/eo/approved", adminAuth, async (req, res) => {
  try {
    const eo = await prisma.eoVerification.findMany({
      where: { status: "APPROVED" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: eo.length,
      data: eo,
    });
  } catch (error) {
    console.error("Error fetching approved EO:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data EO approved",
    });
  }
});

// GET EO REJECTED
router.get("/eo/rejected", adminAuth, async (req, res) => {
  try {
    const eo = await prisma.eoVerification.findMany({
      where: { status: "REJECTED" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: eo.length,
      data: eo,
    });
  } catch (error) {
    console.error("Error fetching rejected EO:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data EO rejected",
    });
  }
});

// GET ALL EO - Semua status
router.get("/eo", adminAuth, async (req, res) => {
  try {
    const { status } = req.query; // Optional filter by status

    const whereClause = status ? { status: status.toUpperCase() } : {};

    const list = await prisma.eoVerification.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    console.error("Error fetching all EO:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data EO",
    });
  }
});

// GET EO DETAIL by ID
router.get("/eo/:id", adminAuth, async (req, res) => {
  try {
    const id = req.params.id;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID tidak valid",
      });
    }

    const data = await prisma.eoVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data EO tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching EO detail:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail EO",
    });
  }
});

// APPROVE EO
router.post("/eo/approve/:id", adminAuth, async (req, res) => {
  try {
    const eoId = req.params.id;

    const eo = await prisma.eoVerification.findUnique({
      where: { id: eoId },
      include: { user: true },
    });

    if (!eo) {
      return res.status(404).json({ error: "EO tidak ditemukan" });
    }

    if (!eo.user) {
      return res.status(500).json({ error: "User EO tidak ditemukan" });
    }

    // Approve
    await prisma.eoVerification.update({
      where: { id: eoId },
      data: { status: "APPROVED" },
    });

    // Update role user
    await prisma.user.update({
      where: { id: eo.user.id },
      data: { role: "EO" },
    });

    return res.json({ message: "EO berhasil disetujui" });
  } catch (error) {
    console.error("Error approving EO:", error);
    res.status(500).json({ error: "Gagal approve EO" });
  }
});

// REJECT EO
router.post("/eo/reject/:id", adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const id = req.params.id;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID tidak valid",
      });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan harus diisi",
      });
    }

    // Cek apakah EO verification exists
    const existingEO = await prisma.eoVerification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingEO) {
      return res.status(404).json({
        success: false,
        message: "Data EO tidak ditemukan",
      });
    }

    if (existingEO.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "EO sudah direject sebelumnya",
      });
    }

    // Update status menjadi REJECTED dengan note berisi reason
    const eo = await prisma.eoVerification.update({
      where: { id },
      data: {
        status: "REJECTED",
        note: reason.trim(),
        updatedAt: new Date(),
      },
    });

    // Log audit ke AdminAuditLog
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.admin.id,
        action: "REJECT_EO",
        targetId: id,
        detail: `EO Rejected: ${existingEO.fullName} - Reason: ${reason}`,
      },
    });

    // Log audit ke EoAuditLog
    await prisma.eoAuditLog.create({
      data: {
        eoId: id,
        action: "REJECT",
        actorId: req.admin.id,
        actorRole: "ADMIN",
        note: reason.trim(),
        meta: {
          adminEmail: req.admin.email,
          rejectedAt: new Date().toISOString(),
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "EO berhasil ditolak",
      data: eo,
    });
  } catch (error) {
    console.error("Error rejecting EO:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal reject EO",
    });
  }
});

module.exports = router;
