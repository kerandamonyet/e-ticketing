const adminAuditService = require("../../services/admin/audit.service");

module.exports = {
  getAdminAuditLogs: (req, res) =>
    adminAuditService.getAdminAuditLogs(req, res),
};
