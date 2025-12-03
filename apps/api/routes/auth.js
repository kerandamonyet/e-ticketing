const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Auth = require("../middleware/userAuth");

const prisma = require("../../../packages/db");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Semua field wajib diisi" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Email sudah terdaftar" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
    });

    res.json({
      message: "Register berhasil",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
// ❌ Hapus Auth → ini menyebabkan login gagal sebelum token dibuat
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password wajib" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { eoVerification: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Email atau password salah" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ error: "Akun kamu dinonaktifkan. Hubungi admin." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Email atau password salah" });
    }

    // EO validation
    if (user.role === "EO") {
      if (!user.eoVerification) {
        return res
          .status(403)
          .json({ error: "Data verifikasi EO belum disubmit." });
      }

      if (user.eoVerification.status === "PENDING") {
        return res.status(403).json({ error: "Verifikasi EO masih diproses." });
      }

      if (user.eoVerification.status === "REJECTED") {
        return res.status(403).json({
          error: "Verifikasi EO ditolak.",
          note: user.eoVerification.note || null,
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      message: "Login sukses",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET LOGGED USER
router.get("/me", Auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User tidak valid" });
    }

    res.json({ user });
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil session" });
  }
});

// LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    path: "/",
  });
  res.json({ success: true });
});

module.exports = router;
