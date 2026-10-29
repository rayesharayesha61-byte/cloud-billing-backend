const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getUsers,
  updateUserStatus,
  getSubscriptions,
  updateSubscription,
  getReports,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuth");

router.use(authMiddleware);
router.use(adminAuth);

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/subscriptions", getSubscriptions);
router.patch("/subscriptions/:userId", updateSubscription);
router.get("/reports", getReports);

module.exports = router;