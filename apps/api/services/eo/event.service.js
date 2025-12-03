const { PrismaClient, EventType } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  // CREATE EVENT
  create: async (req, res) => {
    try {
      // EO ID dari middleware
      const eoId = req.eo?.id;
      if (!eoId) {
        return res.status(400).json({ error: "EO ID tidak ditemukan" });
      }

      const {
        title,
        description,
        startDate,
        endDate,
        type,
        timezone,
        ticketLimit,
        saleStart,
        saleEnd,
        banner,
        locations,
        onlineLinks,
      } = req.body;

      const event = await prisma.event.create({
        data: {
          eoId,
          title,
          description: description ?? null,

          // ENUM Prisma
          type: type === "ONLINE" ? EventType.ONLINE : EventType.OFFLINE,

          startDate: new Date(startDate),
          endDate: new Date(endDate),

          timezone: timezone ?? "Asia/Jakarta",

          ticketLimit: ticketLimit ? Number(ticketLimit) : null,
          saleStart: saleStart ? new Date(saleStart) : null,
          saleEnd: saleEnd ? new Date(saleEnd) : null,

          banner: banner ?? null,

          // RELATION: OFFLINE
          locations: locations
            ? {
                create: locations.map((loc) => ({
                  label: loc.label,
                  address: loc.address ?? null,
                  mapLink: loc.mapLink ?? null,
                })),
              }
            : undefined,

          // RELATION: ONLINE
          onlineLinks: onlineLinks
            ? {
                create: onlineLinks.map((link) => ({
                  platform: link.platform,
                  url: link.url,
                })),
              }
            : undefined,
        },
        include: {
          locations: true,
          onlineLinks: true,
        },
      });

      return res.json({
        success: true,
        message: "Event berhasil dibuat",
        data: event,
      });
    } catch (error) {
      console.error("create event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // LIST EVENT BY EO
  list: async (req, res) => {
    try {
      const eoId = req.eoId;

      const events = await prisma.event.findMany({
        where: { eoId },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error("list event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // DETAIL EVENT
  detail: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      const event = await prisma.event.findUnique({
        where: { id },
      });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      return res.json({ success: true, data: event });
    } catch (error) {
      console.error("detail event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // UPDATE EVENT
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const eoId = req.eoId;

      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
      });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message: "Tidak punya akses untuk edit event ini",
        });
      }

      const updated = await prisma.event.update({
        where: { id: parseInt(id) },
        data: {
          title: req.body.title ?? event.title,
          description: req.body.description ?? event.description,
          venue: req.body.venue ?? event.venue,
          category: req.body.category ?? event.category,
          startDate: req.body.startDate
            ? new Date(req.body.startDate)
            : event.startDate,
          endDate: req.body.endDate
            ? new Date(req.body.endDate)
            : event.endDate,
          coverImage: req.body.coverImage ?? event.coverImage,
        },
      });

      return res.json({
        success: true,
        message: "Event berhasil diupdate",
        data: updated,
      });
    } catch (error) {
      console.error("update event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // DELETE EVENT
  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const eoId = req.eoId;

      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
      });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message: "Tidak punya akses",
        });
      }

      await prisma.event.delete({
        where: { id: parseInt(id) },
      });

      return res.json({
        success: true,
        message: "Event berhasil dihapus",
      });
    } catch (error) {
      console.error("delete event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // UPDATE STATUS (draft → published → finished)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const eoId = req.eoId;

      const allowedStatus = ["draft", "published", "finished"];

      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Status tidak valid" });
      }

      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
      });

      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event tidak ditemukan" });
      }

      if (event.eoId !== eoId) {
        return res.status(403).json({
          success: false,
          message: "Tidak punya akses",
        });
      }

      const updated = await prisma.event.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      return res.json({
        success: true,
        message: "Status event diperbarui",
        data: updated,
      });
    } catch (error) {
      console.error("update status event error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
