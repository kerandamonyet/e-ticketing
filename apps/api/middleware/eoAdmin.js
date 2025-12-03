// middleware/eoAdmin.js
const prisma = require("../../../packages/db");

module.exports = async function eoAdmin(req, res, next) {
  const userId = req.user.id;

  try {
    // 1️⃣ Periksa apakah user adalah OWNER EO
    const eoOwned = await prisma.eO.findUnique({
      where: { ownerId: userId },
    });

    if (eoOwned) {
      // User adalah OWNER EO → otomatis admin penuh
      req.eo = eoOwned;
      req.eoMember = null; // owner tidak berasal dari EOTeamMember
      return next();
    }

    // 2️⃣ Jika bukan owner → cek apakah dia admin di tim EO
    const eoTeam = await prisma.eOTeamMember.findFirst({
      where: { userId, role: "ADMIN" },
      include: { eo: true },
    });

    if (eoTeam) {
      req.eo = eoTeam.eo;
      req.eoMember = eoTeam;
      return next();
    }

    // ❌ Tidak punya akses admin EO
    return res
      .status(403)
      .json({ error: "Hanya EO Owner atau EO Admin yang boleh mengakses" });
  } catch (err) {
    console.error("eoAdmin error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
