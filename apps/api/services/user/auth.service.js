// api/service/user/auth.service.js
const prisma = require("../../../../packages/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  // REGISTER
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      throw { status: 400, message: "Semua field wajib diisi" };
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw { status: 409, message: "Email sudah terdaftar" };
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    return {
      message: "Register berhasil",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  },

  // LOGIN
  async login({ email, password }) {
    if (!email || !password) {
      throw { status: 400, message: "Email & password wajib" };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { eoVerification: true },
    });

    if (!user) {
      throw { status: 401, message: "Email atau password salah" };
    }

    if (!user.isActive) {
      throw { status: 403, message: "Akun kamu dinonaktifkan. Hubungi admin." };
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw { status: 401, message: "Email atau password salah" };
    }

    // EO VALIDATION
    if (user.role === "EO") {
      if (!user.eoVerification) {
        throw { status: 403, message: "Data verifikasi EO belum disubmit." };
      }

      if (user.eoVerification.status === "PENDING") {
        throw { status: 403, message: "Verifikasi EO masih diproses." };
      }

      if (user.eoVerification.status === "REJECTED") {
        throw {
          status: 403,
          message: "Verifikasi EO ditolak.",
          note: user.eoVerification.note || null,
        };
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },

  // GET SESSION (ME)
  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw { status: 401, message: "User tidak valid" };
    }

    return user;
  },
};
