
// const express = require("express");
// const router = express.Router();

// const {
//   getSubscription,
//   changePlan,
// } = require("../controllers/subscriptionController");

// const {
//   submitPayment,
//   getPendingPayments,
//   approvePayment,
//   rejectPayment,
// } = require("../controllers/subscriptionPaymentController");

// const authMiddleware = require("../middleware/authMiddleware");

// // Get subscription details
// router.get("/", authMiddleware, getSubscription);

// // Select or change plan
// router.put("/", authMiddleware, changePlan);

// // Submit UPI payment details
// router.post("/payments", authMiddleware, submitPayment);

// // Admin: view pending payments
// router.get(
//   "/payments/pending",
//   authMiddleware,
//   getPendingPayments
// );

// // Admin: approve payment after verifying the actual transaction
// router.put(
//   "/payments/:id/approve",
//   authMiddleware,
//   approvePayment
// );

// // Admin: reject payment
// router.put(
//   "/payments/:id/reject",
//   authMiddleware,
//   rejectPayment
// );

// module.exports = router;

const express = require("express");
const router = express.Router();

// Subscription Controller
const {
  getSubscription,
  changePlan,
} = require("../controllers/subscriptionController");

// Subscription Payment Controller
const {
  submitPayment,
  getPendingPayments,
  approvePayment,
  rejectPayment,
} = require("../controllers/subscriptionPaymentController");

// Authentication Middleware
const authMiddleware = require("../middleware/authMiddleware");

// GET CURRENT SUBSCRIPTION
router.get("/", authMiddleware, getSubscription);

// SELECT / CHANGE SUBSCRIPTION PLAN
router.put("/", authMiddleware, changePlan);

// SUBMIT UPI PAYMENT
router.post("/payments", authMiddleware, submitPayment);

// ADMIN - GET PENDING PAYMENTS
router.get(
  "/payments/pending",
  authMiddleware,
  getPendingPayments
);

// ADMIN - APPROVE PAYMENT
router.put(
  "/payments/:id/approve",
  authMiddleware,
  approvePayment
);

// ADMIN - REJECT PAYMENT
router.put(
  "/payments/:id/reject",
  authMiddleware,
  rejectPayment
);

module.exports = router;
