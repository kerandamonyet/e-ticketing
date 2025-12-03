const prisma = require("../../../../packages/db");

module.exports = {
  // CREATE TICKET TYPE
  create: async (req, res) => {
    try {
      const eoId = req.user.eoId;
      const eventId = parseInt(req.params.eventId);

      // Pastikan event milik EO
      const event = await prisma.event.findUnique({ where: { id: eventId } });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message:
            "Anda tidak punya akses untuk menambah ticket type pada event ini",
        });
      }

      const ticketType = await prisma.ticketType.create({
        data: {
          eventId,
          name: req.body.name,
          description: req.body.description ?? null,
          price: Number(req.body.price),
          quota: Number(req.body.quota),
          status: "active",
        },
      });

      return res.json({
        success: true,
        message: "Ticket type berhasil dibuat",
        data: ticketType,
      });
    } catch (error) {
      console.error("create ticket type error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // LIST TICKET TYPES BY EVENT
  list: async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const eoId = req.user.eoId;

      const event = await prisma.event.findUnique({ where: { id: eventId } });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      if (event.eoId !== eoId) {
        return res
          .status(403)
          .json({ success: false, message: "Tidak punya akses" });
      }

      const ticketTypes = await prisma.ticketType.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        data: ticketTypes,
      });
    } catch (error) {
      console.error("list ticket type error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // DETAIL TICKET TYPE
  detail: async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const id = parseInt(req.params.id);
      const eoId = req.user.eoId;

      const ticketType = await prisma.ticketType.findUnique({
        where: { id },
      });

      if (!ticketType) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket type tidak ditemukan" });
      }

      // Cek akses EO → Event
      const event = await prisma.event.findUnique({
        where: { id: ticketType.eventId },
      });

      if (event.eoId !== eoId) {
        return res
          .status(403)
          .json({ success: false, message: "Tidak punya akses" });
      }

      return res.json({
        success: true,
        data: ticketType,
      });
    } catch (error) {
      console.error("detail ticket type error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // UPDATE TICKET TYPE
  update: async (req, res) => {
    try {
      const { eventId, id } = req.params;
      const eoId = req.user.eoId;

      const ticketType = await prisma.ticketType.findUnique({
        where: { id: parseInt(id) },
      });

      if (!ticketType) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket type tidak ditemukan" });
      }

      const event = await prisma.event.findUnique({
        where: { id: ticketType.eventId },
      });

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message: "Tidak punya akses untuk edit ticket type",
        });
      }

      const updated = await prisma.ticketType.update({
        where: { id: parseInt(id) },
        data: {
          name: req.body.name ?? ticketType.name,
          description: req.body.description ?? ticketType.description,
          price: req.body.price ? Number(req.body.price) : ticketType.price,
          quota: req.body.quota ? Number(req.body.quota) : ticketType.quota,
        },
      });

      return res.json({
        success: true,
        message: "Ticket type berhasil diupdate",
        data: updated,
      });
    } catch (error) {
      console.error("update ticket type error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // DELETE TICKET TYPE
  remove: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eoId = req.user.eoId;

      const ticketType = await prisma.ticketType.findUnique({ where: { id } });

      if (!ticketType) {
        return res
          .status(404)
          .json({ success: false, message: "Ticket type tidak ditemukan" });
      }

      const event = await prisma.event.findUnique({
        where: { id: ticketType.eventId },
      });

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message: "Tidak punya akses untuk menghapus ticket type ini",
        });
      }

      await prisma.ticketType.delete({ where: { id } });

      return res.json({
        success: true,
        message: "Ticket type berhasil dihapus",
      });
    } catch (error) {
      console.error("delete ticket type error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
