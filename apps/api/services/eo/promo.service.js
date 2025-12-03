const prisma = require("../../../../packages/db");

module.exports = {
  createPromo: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { code, type, value, quota, minPurchase, startAt, endAt } =
        req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event tidak ditemukan",
        });
      }

      const existingCode = await prisma.eventPromo.findFirst({
        where: { code, eventId },
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Kode promo sudah digunakan",
        });
      }

      const promo = await prisma.eventPromo.create({
        data: {
          eventId,
          code,
          type, // percentage | nominal
          value: Number(value),
          quota: Number(quota),
          minPurchase: Number(minPurchase),
          startAt: new Date(startAt),
          endAt: new Date(endAt),
        },
      });

      return res.json({
        success: true,
        message: "Promo berhasil dibuat",
        data: promo,
      });
    } catch (error) {
      console.error("createPromo service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  getPromos: async (req, res) => {
    try {
      const { eventId } = req.params;

      const promos = await prisma.eventPromo.findMany({
        where: { eventId },
        orderBy: { startAt: "asc" },
      });

      return res.json({
        success: true,
        data: promos,
      });
    } catch (error) {
      console.error("getPromos service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  updatePromo: async (req, res) => {
    try {
      const { promoId } = req.params;
      const { code, type, value, quota, minPurchase, startAt, endAt } =
        req.body;

      const promo = await prisma.eventPromo.findUnique({
        where: { id: promoId },
      });

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: "Promo tidak ditemukan",
        });
      }

      // kalau update code, pastikan tidak duplicate
      if (code && code !== promo.code) {
        const exists = await prisma.eventPromo.findFirst({
          where: { code, eventId: promo.eventId },
        });

        if (exists) {
          return res.status(400).json({
            success: false,
            message: "Kode promo sudah digunakan",
          });
        }
      }

      const updated = await prisma.eventPromo.update({
        where: { id: promoId },
        data: {
          code: code ?? promo.code,
          type: type ?? promo.type,
          value: value ? Number(value) : promo.value,
          quota: quota ? Number(quota) : promo.quota,
          minPurchase: minPurchase ? Number(minPurchase) : promo.minPurchase,
          startAt: startAt ? new Date(startAt) : promo.startAt,
          endAt: endAt ? new Date(endAt) : promo.endAt,
        },
      });

      return res.json({
        success: true,
        message: "Promo berhasil diperbarui",
        data: updated,
      });
    } catch (error) {
      console.error("updatePromo service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  deletePromo: async (req, res) => {
    try {
      const { promoId } = req.params;

      const promo = await prisma.eventPromo.findUnique({
        where: { id: promoId },
      });

      if (!promo) {
        return res.status(404).json({
          success: false,
          message: "Promo tidak ditemukan",
        });
      }

      await prisma.eventPromo.delete({
        where: { id: promoId },
      });

      return res.json({
        success: true,
        message: "Promo berhasil dihapus",
      });
    } catch (error) {
      console.error("deletePromo service error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
