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
router.post("/register", authController.register);
router.post("/login", authController.login);

router.post(
  "/forgot-password",
  authController.getSecurityQuestion
);

router.post(
  "/reset-password",
  authController.resetPassword
);