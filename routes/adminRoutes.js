const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth");
const admin = require("../controllers/adminController");

router.use(adminAuth);

router.get("/dashboard", admin.getDashboard);

router.get("/users", admin.getUsers);
router.patch("/users/:id/status", admin.updateUserStatus);

router.get("/subscriptions", admin.getSubscriptions);
router.patch("/subscriptions/:userId", admin.updateSubscription);

router.get("/reports", admin.getReports);

module.exports = router;