const express = require("express");
const router = express.Router();
const prisma = require("../../../../packages/db");
const auth = require("../../middleware/userAuth");
const { eoValidator } = require("../../validators/eo/eo.validator");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// ====== Upload Config ======
const uploadDir = "uploads/eo";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format gambar salah"), false);
    }
    cb(null, true);
  },
});

// ====== ROUTES ======
router.post(
  "/apply",
  auth,
  upload.fields([
    { name: "ktpImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  require("../../controllers/eo/apply.controller").applyEO
);

router.put(
  "/update",
  auth,
  upload.fields([
    { name: "ktpImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  require("../../controllers/eo/apply.controller").updateEO
);

router.get(
  "/my-status",
  auth,
  require("../../controllers/eo/apply.controller").myStatus
);

module.exports = router;
