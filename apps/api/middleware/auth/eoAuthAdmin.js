// middleware/eoAuthAdmin.js
const jwt = require("jsonwebtoken");
const prisma = require("../../../../packages/db");

module.exports = async function eoAuthAdmin(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (decoded.role !== "EO") {
      return res.status(403).json({ error: "EO access only" });
    }

    req.user = decoded;
    const userId = decoded.id;

    // 1️⃣ CEK OWNER EO
    const eoOwned = await prisma.EO.findUnique({
      where: { ownerId: userId },
    });

    if (eoOwned) {
      req.eo = eoOwned;
      req.eoId = eoOwned.id; // ← FIX PENTING
      req.eoMember = null;
      return next();
    }

    // 2️⃣ CEK ADMIN TIM EO
    const eoTeam = await prisma.EOTeamMember.findFirst({
      where: {
        userId,
        role: "ADMIN",
      },
      include: { eo: true },
    });

    if (eoTeam) {
      req.eo = eoTeam.eo;
      req.eoId = eoTeam.eo.id; // ← FIX PENTING
      req.eoMember = eoTeam;
      return next();
    }

    return res.status(403).json({
      error: "Hanya EO Owner atau EO Admin yang boleh mengakses",
    });
  } catch (err) {
    console.error("eoAuthAdmin error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
