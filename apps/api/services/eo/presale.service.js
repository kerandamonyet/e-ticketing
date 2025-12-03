const prisma = require("../../../../packages/db");

module.exports = {
  createPresale: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { name, quota, price, startAt, endAt } = req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event tidak ditemukan",
        });
      }

      const presale = await prisma.eventPresale.create({
        data: {
          eventId,
          name,
          quota: Number(quota),
          price: Number(price),
          startAt: new Date(startAt),
          endAt: new Date(endAt),
        },
      });

      return res.json({
        success: true,
        message: "Presale berhasil dibuat",
        data: presale,
      });
    } catch (error) {
      console.error("createPresale service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  getPresales: async (req, res) => {
    try {
      const { eventId } = req.params;

      const list = await prisma.eventPresale.findMany({
        where: { eventId },
        orderBy: { startAt: "asc" },
      });

      return res.json({
        success: true,
        data: list,
      });
    } catch (error) {
      console.error("getPresales service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  updatePresale: async (req, res) => {
    try {
      const { presaleId } = req.params;
      const { name, quota, price, startAt, endAt } = req.body;

      const exists = await prisma.eventPresale.findUnique({
        where: { id: presaleId },
      });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Presale tidak ditemukan",
        });
      }

      const updated = await prisma.eventPresale.update({
        where: { id: presaleId },
        data: {
          name: name ?? exists.name,
          quota: quota ? Number(quota) : exists.quota,
          price: price ? Number(price) : exists.price,
          startAt: startAt ? new Date(startAt) : exists.startAt,
          endAt: endAt ? new Date(endAt) : exists.endAt,
        },
      });

      return res.json({
        success: true,
        message: "Presale berhasil diperbarui",
        data: updated,
      });
    } catch (error) {
      console.error("updatePresale service error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  deletePresale: async (req, res) => {
    try {
      const { presaleId } = req.params;

      const exists = await prisma.eventPresale.findUnique({
        where: { id: presaleId },
      });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Presale tidak ditemukan",
        });
      }

      await prisma.eventPresale.delete({
        where: { id: presaleId },
      });

      return res.json({
        success: true,
        message: "Presale berhasil dihapus",
      });
    } catch (error) {
      console.error("deletePresale service error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
