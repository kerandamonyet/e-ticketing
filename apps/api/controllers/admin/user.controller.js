const adminUserService = require("../../services/admin/user.service");

module.exports = {
  getAllUsers: (req, res) => adminUserService.getAllUsers(req, res),
  getUserById: (req, res) => adminUserService.getUserById(req, res),
  updateStatus: (req, res) => adminUserService.updateStatus(req, res),
  deleteUser: (req, res) => adminUserService.deleteUser(req, res),
  exportUsers: (req, res) => adminUserService.exportUsers(req, res),
};
