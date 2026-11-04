// const express = require("express");
// const router = express.Router();

// const auth = require("../middleware/superAdminAuth");
// const controller = require("../controllers/superAdminController");

// router.use(auth);

// router.get("/dashboard", controller.getDashboard);

// router.get("/users", controller.getUsers);
// router.patch("/users/:id/status", controller.updateUserStatus);

// router.get("/businesses", controller.getBusinesses);

// router.get("/subscriptions", controller.getSubscriptions);
// router.patch("/subscriptions/:userId", controller.updateSubscription);

// router.get("/payments", controller.getPayments);
// router.patch("/payments/:id/status", controller.updatePaymentStatus);

// router.get("/plans", controller.getPlans);

// router.get("/trials", controller.getTrials);
// router.patch("/trials/:id", controller.extendTrial);

// router.get("/reports", controller.getReports);

// // Not configured until the required database tables are created
// router.get("/coupons", controller.notImplemented);
// router.get("/notifications", controller.notImplemented);
// router.get("/tickets", controller.notImplemented);
// router.get("/login-activity", controller.notImplemented);
// router.get("/settings", controller.notImplemented);

// module.exports = router;

const express = require("express");
const router = express.Router();

const auth = require("../middleware/superAdminAuth");
const controller = require("../controllers/superAdminController");

router.use(auth);

router.get("/dashboard", controller.getDashboard);

router.get("/users", controller.getUsers);
router.patch("/users/:id/status", controller.updateUserStatus);

router.get("/businesses", controller.getBusinesses);

router.get("/subscriptions", controller.getSubscriptions);
router.patch("/subscriptions/:userId", controller.updateSubscription);

router.get("/payments", controller.getPayments);
router.patch("/payments/:id/status", controller.updatePaymentStatus);

router.get("/plans", controller.getPlans);

router.get("/trials", controller.getTrials);
router.patch("/trials/:id", controller.extendTrial);

router.get("/reports", controller.getReports);

router.get("/coupons", controller.notImplemented);
router.get("/notifications", controller.notImplemented);
router.get("/tickets", controller.notImplemented);

// Login Activity
router.get("/login-activity", controller.getLoginActivity);

router.get("/settings", controller.notImplemented);

module.exports = router;
