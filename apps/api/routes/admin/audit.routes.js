const router = require("express").Router();
const adminAuth = require("../../middleware/adminAuth");

const {
  getAdminAuditLogs,
} = require("../../controllers/admin/audit.controller");

router.get("/users", adminAuth, getAdminAuditLogs);

module.exports = router;
