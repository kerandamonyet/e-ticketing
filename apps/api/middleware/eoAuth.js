// middleware/eoAuth.js
const jwt = require("jsonwebtoken");
const prisma = require("../../../packages/db");

module.exports = async function eoAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "EO") {
      return res.status(403).json({ error: "EO access only" });
    }

    // Ambil EO milik user
    const eo = await prisma.eO.findUnique({
      where: { ownerId: decoded.id },
    });

    if (!eo) {
      return res.status(403).json({
        error: "Anda belum memiliki data EO, silakan daftar EO terlebih dahulu",
      });
    }

    // PASANG KE REQUEST
    req.user = decoded; // id + role
    req.eo = eo; // seluruh object EO
    req.eoId = eo.id; // ini yg dipakai create event

    next();
  } catch (err) {
    console.error("eoAuth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
