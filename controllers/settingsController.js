
const db = require("../config/db");

const getSettings = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Please login again.",
    });
  }

  const sql = `
    SELECT
      business_name,
      owner_name,
      email,
      phone,
      address,
      gst_number,
      pan_number,
      state,
      invoice_prefix,
      default_gst,
      currency,
      email_notifications,
      invoice_notifications
    FROM business_settings
    WHERE user_id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], (error, rows) => {
    if (error) {
      console.error("Get settings error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load settings.",
      });
    }

    const row = rows[0] || {};

    return res.json({
      success: true,
      settings: {
        businessName: row.business_name || "",
        ownerName: row.owner_name || "",
        email: row.email || "",
        phone: row.phone || "",
        address: row.address || "",
        gstNumber: row.gst_number || "",
        panNumber: row.pan_number || "",
        state: row.state || "",
        invoicePrefix: row.invoice_prefix || "INV",
        defaultGst: String(row.default_gst ?? 18),
        currency: row.currency || "INR",
        emailNotifications:
          row.email_notifications == null
            ? true
            : Boolean(row.email_notifications),
        invoiceNotifications:
          row.invoice_notifications == null
            ? true
            : Boolean(row.invoice_notifications),
      },
    });
  });
};

const updateSettings = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Please login again.",
    });
  }

  const body = req.body || {};

  const businessName = String(body.businessName || "").trim();
  const ownerName = String(body.ownerName || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const gstNumber = String(body.gstNumber || "").trim();
  const panNumber = String(body.panNumber || "").trim();
  const state = String(body.state || "").trim();
  const invoicePrefix = String(
    body.invoicePrefix || "INV"
  ).trim();

  const defaultGst = Number(body.defaultGst ?? 18);
  const currency = String(body.currency || "INR").trim();

  const emailNotifications =
    body.emailNotifications === false ? 0 : 1;

  const invoiceNotifications =
    body.invoiceNotifications === false ? 0 : 1;

  if (
    !Number.isFinite(defaultGst) ||
    defaultGst < 0 ||
    defaultGst > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid GST percentage.",
    });
  }

  if (!invoicePrefix || invoicePrefix.length > 20) {
    return res.status(400).json({
      success: false,
      message: "Invoice prefix must contain 1–20 characters.",
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  const sql = `
    INSERT INTO business_settings (
      user_id,
      business_name,
      owner_name,
      email,
      phone,
      address,
      gst_number,
      pan_number,
      state,
      invoice_prefix,
      default_gst,
      currency,
      email_notifications,
      invoice_notifications
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      business_name = VALUES(business_name),
      owner_name = VALUES(owner_name),
      email = VALUES(email),
      phone = VALUES(phone),
      address = VALUES(address),
      gst_number = VALUES(gst_number),
      pan_number = VALUES(pan_number),
      state = VALUES(state),
      invoice_prefix = VALUES(invoice_prefix),
      default_gst = VALUES(default_gst),
      currency = VALUES(currency),
      email_notifications = VALUES(email_notifications),
      invoice_notifications = VALUES(invoice_notifications)
  `;

  const values = [
    userId,
    businessName,
    ownerName,
    email,
    phone,
    address,
    gstNumber,
    panNumber,
    state,
    invoicePrefix,
    defaultGst,
    currency,
    emailNotifications,
    invoiceNotifications,
  ];

  db.query(sql, values, (error) => {
    if (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save settings.",
      });
    }

    return res.json({
      success: true,
      message: "Settings saved successfully.",
    });
  });
};

module.exports = {
  getSettings,
  updateSettings,
};
