const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getSummary,
  getSalesReport,
  getGstReport,
  getCustomerReport,
  getProductReport,
} = require("../controllers/reportController");

router.get("/summary", authMiddleware, getSummary);
router.get("/sales", authMiddleware, getSalesReport);
router.get("/gst", authMiddleware, getGstReport);
router.get("/customers", authMiddleware, getCustomerReport);
router.get("/products", authMiddleware, getProductReport);

module.exports = router;