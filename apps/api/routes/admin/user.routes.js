const router = require("express").Router();
const adminAuth = require("../../middleware/adminAuth");

const {
  getAllUsers,
  getUserById,
  updateStatus,
  deleteUser,
  exportUsers,
} = require("../../controllers/admin/user.controller");

router.get("/", adminAuth, getAllUsers);
router.get("/:id", adminAuth, getUserById);
router.put("/:id/status", adminAuth, updateStatus);
router.delete("/:id", adminAuth, deleteUser);
router.get("/export-excel/users", adminAuth, exportUsers);

module.exports = router;
