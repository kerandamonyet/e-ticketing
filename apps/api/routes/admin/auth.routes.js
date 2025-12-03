const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const adminAuth = require("../../middleware/adminAuth");

const {
  login,
  me,
  logout,
} = require("../../controllers/admin/auth.controller");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Coba lagi nanti.",
  },
});

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Login Admin
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@mail.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Email / password salah
 */
router.post("/login", limiter, login);

/**
 * @swagger
 * /admin/auth/me:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin Auth]
 *     responses:
 *       200:
 *         description: Admin info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
 */

router.get("/me", adminAuth, me);
router.post("/logout", limiter, logout);

module.exports = router;
