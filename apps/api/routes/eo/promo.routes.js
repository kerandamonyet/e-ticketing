const router = require("express").Router();
const eoAuthAdmin = require("../../middleware/auth/eoAuthAdmin");

const promoController = require("../../controllers/eo/promo.controller");

// Akses EO
router.post("/:eventId", eoAuthAdmin, promoController.createPromo);
router.get("/:eventId", eoAuthAdmin, promoController.getPromos);
router.put("/:promoId", eoAuthAdmin, promoController.updatePromo);
router.delete("/:promoId", eoAuthAdmin, promoController.deletePromo);

module.exports = router;
