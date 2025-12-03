const router = require("express").Router();
const auth = require("../../middleware/userAuth");

const {
  createPresale,
  getPresales,
  updatePresale,
  deletePresale,
} = require("../../controllers/eo/presale.controller");

router.post("/:eventId", auth, createPresale);
router.get("/:eventId", auth, getPresales);
router.put("/:presaleId", auth, updatePresale);
router.delete("/:presaleId", auth, deletePresale);

module.exports = router;
