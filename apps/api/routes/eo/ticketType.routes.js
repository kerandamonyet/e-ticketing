const express = require("express");
const router = express.Router();
const eoAuth = require("../../middleware/eoAuth");
const eoAdmin = require("../../middleware/eoAdmin");
const controller = require("../../controllers/eo/ticketType.controller");

router.post("/event/:eventId/ticket-type", eoAuth, eoAdmin, controller.create);
router.get("/event/:eventId/ticket-types", eoAuth, controller.list);
router.get("/event/:eventId/ticket-type/:id", eoAuth, controller.detail);
router.put(
  "/event/:eventId/ticket-type/:id",
  eoAuth,
  eoAdmin,
  controller.update
);
router.delete(
  "/event/:eventId/ticket-type/:id",
  eoAuth,
  eoAdmin,
  controller.remove
);

module.exports = router;
