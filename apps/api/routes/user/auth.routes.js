const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/userAuth");

const AuthController = require("../../controllers/user/auth.controller");
const AuthValidator = require("../../validators/user/auth.validator");

// REGISTER
router.post("/register", AuthValidator.register, AuthController.register);

// LOGIN
router.post("/login", AuthValidator.login, AuthController.login);

// GET SESSION
router.get("/me", AuthMiddleware, AuthController.me);

// LOGOUT
router.post("/logout", AuthController.logout);

module.exports = router;
