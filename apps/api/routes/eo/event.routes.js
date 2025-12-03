const express = require("express");
const router = express.Router();
const eoAuthAdmin = require("../../middleware/auth/eoAuthAdmin");
const controller = require("../../controllers/eo/event.controller");

router.post("/create", eoAuthAdmin, controller.create);
router.get("/all", eoAuthAdmin, controller.list);
router.get("/:id", eoAuthAdmin, controller.detail);
router.put("/:id", eoAuthAdmin, controller.update);
router.delete("/:id", eoAuthAdmin, controller.remove);
router.patch("/:id/status", eoAuthAdmin, controller.updateStatus);

module.exports = router;
