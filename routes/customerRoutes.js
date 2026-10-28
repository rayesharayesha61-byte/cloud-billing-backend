const express = require("express");

const router = express.Router();

const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const authMiddleware = require("../middleware/authMiddleware");

// GET all customers
router.get("/", authMiddleware, getCustomers);

// ADD customer
router.post("/", authMiddleware, createCustomer);

// UPDATE customer
router.put("/:id", authMiddleware, updateCustomer);

// DELETE customer
router.delete("/:id", authMiddleware, deleteCustomer);

module.exports = router;