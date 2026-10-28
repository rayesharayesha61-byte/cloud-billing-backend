const express = require("express");

const router = express.Router();

const {
  createInvoice,
  getInvoices,
  getInvoiceById,
} = require("../controllers/invoiceController");

const authMiddleware = require("../middleware/authMiddleware");

// Create invoice
router.post(
  "/",
  authMiddleware,
  createInvoice
);

// Get all invoices
router.get(
  "/",
  authMiddleware,
  getInvoices
);

// Get single invoice
router.get(
  "/:id",
  authMiddleware,
  getInvoiceById
);

module.exports = router;