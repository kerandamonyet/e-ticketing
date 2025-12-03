const prisma = require("../../../../packages/db");
const ExcelJS = require("exceljs");

module.exports = {
  getAllUsers: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, data: users });
    } catch (error) {
      console.error("getAllUsers error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User tidak ditemukan" });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      console.error("getUserById error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      });

      return res.json({
        success: true,
        message: "Status user diperbarui",
        data: user,
      });
    } catch (error) {
      console.error("updateStatus error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await prisma.user.delete({
        where: { id: req.params.id },
      });

      return res.json({ success: true, message: "User dihapus" });
    } catch (error) {
      console.error("deleteUser error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  exportUsers: async (req, res) => {
    try {
      const users = await prisma.user.findMany();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Users");

      sheet.columns = [
        { header: "ID", key: "id", width: 20 },
        { header: "Name", key: "name", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Status", key: "status", width: 15 },
        { header: "Created At", key: "createdAt", width: 25 },
      ];

      users.forEach((u) => sheet.addRow(u));

      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("exportUsers error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
