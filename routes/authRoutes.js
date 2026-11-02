// const express = require("express");

// const router = express.Router();

// const {
//   register,
//   login,
// } = require("../controllers/authController");

// router.post(
//   "/register",
//   register
// );

// router.post(
//   "/login",
//   login
// );

// module.exports = router;

const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Forgot Password - Get Security Question
router.post("/forgot-password", authController.getSecurityQuestion);

// Reset Password
router.post("/reset-password", authController.resetPassword);

module.exports = router;
