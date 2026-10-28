
const express = require("express");
const router = express.Router();

const {
  getSubscription,
  changePlan,
} = require("../controllers/subscriptionController");

const {
  submitPayment,
  getPendingPayments,
  approvePayment,
  rejectPayment,
} = require("../controllers/subscriptionPaymentController");

const authMiddleware = require("../middleware/authMiddleware");

// Get subscription details
router.get("/", authMiddleware, getSubscription);

// Select or change plan
router.put("/", authMiddleware, changePlan);

// Submit UPI payment details
router.post("/payments", authMiddleware, submitPayment);

// Admin: view pending payments
router.get(
  "/payments/pending",
  authMiddleware,
  getPendingPayments
);

// Admin: approve payment after verifying the actual transaction
router.put(
  "/payments/:id/approve",
  authMiddleware,
  approvePayment
);

// Admin: reject payment
router.put(
  "/payments/:id/reject",
  authMiddleware,
  rejectPayment
);

module.exports = router;
