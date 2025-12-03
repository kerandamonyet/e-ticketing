const router = require("express").Router();
const adminAuth = require("../../middleware/adminAuth");

const {
  getCounts,
  getDetails,
  testNotification,
} = require("../../controllers/admin/notification.controller");

router.get("/", adminAuth, getCounts);
router.get("/details", adminAuth, getDetails);
router.get("/test", adminAuth, testNotification);

module.exports = router;
