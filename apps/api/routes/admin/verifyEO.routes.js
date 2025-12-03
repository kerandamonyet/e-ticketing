const router = require("express").Router();
const adminAuth = require("../../middleware/adminAuth");

const {
  getPendingEO,
  getApprovedEO,
  getRejectedEO,
  getAllEO,
  getEODetail,
  approveEO,
  rejectEO,
} = require("../../controllers/admin/verifyEO.controller");

router.get("/eo/pending", adminAuth, getPendingEO);
router.get("/eo/approved", adminAuth, getApprovedEO);
router.get("/eo/rejected", adminAuth, getRejectedEO);
router.get("/eo/", adminAuth, getAllEO);
router.get("/eo/:id", adminAuth, getEODetail);
router.post("/eo/approve/:id", adminAuth, approveEO);
router.post("/eo/reject/:id", adminAuth, rejectEO);

module.exports = router;
