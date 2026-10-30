
const express = require("express");
const router = express.Router();

const admin = require("../middleware/superAdminAuth");
const controller = require("../controllers/superAdminController");

router.use(admin);

// Dashboard
router.get("/dashboard", controller.getDashboard);

// Users
router.get("/users", controller.getUsers);
router.patch("/users/:id/status", controller.updateUserStatus);

// Businesses
router.get("/businesses", controller.getBusinesses);

// Subscriptions
router.get("/subscriptions", controller.getSubscriptions);
router.patch("/subscriptions/:userId", controller.updateSubscription);

// Plans
router.get("/plans", controller.getPlans);
router.post("/plans", controller.createPlan);
router.put("/plans/:id", controller.updatePlan);

// Payments
router.get("/payments", controller.getPayments);
router.patch("/payments/:id/status", controller.updatePaymentStatus);

// Trials
router.get("/trials", controller.getTrials);
router.patch("/trials/:id", controller.updateTrial);

// Coupons (not available in current database)
router.get("/coupons", controller.getCoupons);
router.post("/coupons", controller.createCoupon);
router.patch("/coupons/:id", controller.updateCoupon);

// Notifications (not available in current database)
router.get("/notifications", controller.getNotifications);
router.post("/notifications", controller.createNotification);

// Support tickets (not available in current database)
router.get("/tickets", controller.getTickets);
router.patch("/tickets/:id", controller.updateTicket);

// Reports
router.get("/reports", controller.getReports);

// Login activity (not available in current database)
router.get("/login-activity", controller.getLoginActivity);

// System settings (not available in current database)
router.get("/settings", controller.getSettings);
router.put("/settings", controller.updateSettings);

module.exports = router;
