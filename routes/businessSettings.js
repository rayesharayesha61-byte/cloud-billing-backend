
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// GET: Logged-in user's business information
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.execute(
      `SELECT
        id, business_name, owner_name, mobile, email,
        address, gst_number, pan_number, business_type,
        state, logo, invoice_prefix, invoice_next_number
       FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    return res.json({ business: rows[0] });
  } catch (error) {
    console.error("Get business settings error:", error);
    return res.status(500).json({
      message: "Failed to load business settings.",
    });
  }
});

// PUT: Update logged-in user's business information
router.put("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      business_name,
      owner_name,
      mobile,
      email,
      address,
      gst_number,
      pan_number,
      business_type,
      state,
      logo,
      invoice_prefix,
    } = req.body || {};

    // Required field validation
    if (
      !business_name?.trim() ||
      !owner_name?.trim() ||
      !mobile?.trim() ||
      !email?.trim()
    ) {
      return res.status(400).json({
        message:
          "Business name, owner name, mobile and email are required.",
      });
    }

    const cleanEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const prefix = (invoice_prefix || "INV").trim();

    if (!prefix || prefix.length > 20) {
      return res.status(400).json({
        message: "Invoice prefix must contain 1–20 characters.",
      });
    }

    const [result] = await db.execute(
      `UPDATE businesses SET
        business_name = ?,
        owner_name = ?,
        mobile = ?,
        email = ?,
        address = ?,
        gst_number = ?,
        pan_number = ?,
        business_type = ?,
        state = ?,
        logo = ?,
        invoice_prefix = ?
       WHERE user_id = ?`,
      [
        business_name.trim(),
        owner_name.trim(),
        mobile.trim(),
        cleanEmail,
        address?.trim() || null,
        gst_number?.trim() || null,
        pan_number?.trim() || null,
        business_type?.trim() || null,
        state?.trim() || null,
        logo?.trim() || null,
        prefix,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        id, business_name, owner_name, mobile, email,
        address, gst_number, pan_number, business_type,
        state, logo, invoice_prefix, invoice_next_number
       FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    return res.json({
      message: "Business settings updated successfully.",
      business: rows[0],
    });
  } catch (error) {
    console.error("Update business settings error:", error);
    return res.status(500).json({
      message: "Failed to update business settings.",
    });
  }
});

module.exports = router;
