const express = require("express");
const router = express.Router();

/* ============================
   USER ROUTES
============================ */
router.use("/user/auth", require("./user/auth.routes"));
// router.use("/user", require("./user/user.routes"));

/* ============================
   EO ROUTES
============================ */
router.use("/eo/apply", require("./eo/apply.routes"));
router.use("/eo/event", require("./eo/event.routes"));
router.use("/eo/ticket-type", require("./eo/ticketType.routes"));
router.use("/eo/presale", require("./eo/presale.routes"));
router.use("/eo/promo", require("./eo/promo.routes"));
// router.use("/eo", require("./eo/eo.routes"));

/* ============================
   ADMIN ROUTES
============================ */
router.use("/admin/auth", require("./admin/auth.routes"));
router.use("/admin/audit", require("./admin/audit.routes"));
router.use("/admin/notifications", require("./admin/notification.routes"));
router.use("/admin/users", require("./admin/user.routes"));
router.use("/admin/verify", require("./admin/verifyEO.routes"));
// router.use("/admin", require("./admin/admin.routes")); // jika ada

module.exports = router;
