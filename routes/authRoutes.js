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

router.post(
  "/forgot-password",
  authController.getSecurityQuestion
);

router.post(
  "/reset-password",
  authController.resetPassword
);

module.exports = router;