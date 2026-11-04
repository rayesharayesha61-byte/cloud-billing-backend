const db = require("../config/db");

// GET SYSTEM SETTINGS
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM system_settings WHERE id = 1"
    );

    if (!rows.length) {
      await db.execute(
        "INSERT IGNORE INTO system_settings (id) VALUES (1)"
      );

      const [newRows] = await db.execute(
        "SELECT * FROM system_settings WHERE id = 1"
      );

      return res.status(200).json({
        success: true,
        settings: newRows[0],
      });
    }

    return res.status(200).json({
      success: true,
      settings: rows[0],
    });
  } catch (error) {
    console.error("Get system settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load system settings",
    });
  }
};

// UPDATE SYSTEM SETTINGS
exports.updateSettings = async (req, res) => {
  try {
    const s = req.body;

    const numberFields = [
      ["trial_days", 1, 365],
      ["grace_period_days", 0, 90],
      ["password_min_length", 6, 32],
      ["login_attempt_limit", 1, 20],
      ["session_timeout", 1, 1440],
    ];

    for (const [field, min, max] of numberFields) {
      const value = Number(s[field]);

      if (!Number.isInteger(value) || value < min || value > max) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} value`,
        });
      }
    }

    const booleanFields = [
      "free_trial_enabled",
      "yearly_billing_enabled",
      "auto_expire_subscription",
      "payment_approval_required",
      "registration_enabled",
      "maintenance_mode",
      "new_user_alert",
      "payment_alert",
      "subscription_expiry_alert",
      "trial_expiry_alert",
    ];

    const values = {};

    for (const field of booleanFields) {
      if (
        s[field] !== true &&
        s[field] !== false &&
        s[field] !== 1 &&
        s[field] !== 0 &&
        s[field] !== "1" &&
        s[field] !== "0"
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} value`,
        });
      }

      values[field] = s[field] === true ||
        s[field] === 1 ||
        s[field] === "1" ? 1 : 0;
    }

    const textFields = [
      "company_name",
      "support_email",
      "support_phone",
      "company_address",
      "website_url",
      "upi_id",
      "gpay_number",
      "payment_instructions",
      "terms_conditions",
      "privacy_policy",
      "refund_policy",
    ];

    for (const field of textFields) {
      values[field] = s[field] == null ? "" : String(s[field]).trim();
    }

    if (!values.company_name) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    const sql = `
      INSERT INTO system_settings (
        id,
        company_name, support_email, support_phone,
        company_address, website_url,
        trial_days, free_trial_enabled, yearly_billing_enabled,
        auto_expire_subscription, grace_period_days,
        upi_id, gpay_number, payment_instructions,
        payment_approval_required,
        password_min_length, login_attempt_limit,
        session_timeout, registration_enabled, maintenance_mode,
        new_user_alert, payment_alert,
        subscription_expiry_alert, trial_expiry_alert,
        terms_conditions, privacy_policy, refund_policy
      )
      VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        support_email = VALUES(support_email),
        support_phone = VALUES(support_phone),
        company_address = VALUES(company_address),
        website_url = VALUES(website_url),
        trial_days = VALUES(trial_days),
        free_trial_enabled = VALUES(free_trial_enabled),
        yearly_billing_enabled = VALUES(yearly_billing_enabled),
        auto_expire_subscription = VALUES(auto_expire_subscription),
        grace_period_days = VALUES(grace_period_days),
        upi_id = VALUES(upi_id),
        gpay_number = VALUES(gpay_number),
        payment_instructions = VALUES(payment_instructions),
        payment_approval_required = VALUES(payment_approval_required),
        password_min_length = VALUES(password_min_length),
        login_attempt_limit = VALUES(login_attempt_limit),
        session_timeout = VALUES(session_timeout),
        registration_enabled = VALUES(registration_enabled),
        maintenance_mode = VALUES(maintenance_mode),
        new_user_alert = VALUES(new_user_alert),
        payment_alert = VALUES(payment_alert),
        subscription_expiry_alert = VALUES(subscription_expiry_alert),
        trial_expiry_alert = VALUES(trial_expiry_alert),
        terms_conditions = VALUES(terms_conditions),
        privacy_policy = VALUES(privacy_policy),
        refund_policy = VALUES(refund_policy)
    `;

    const params = [
      values.company_name,
      values.support_email,
      values.support_phone,
      values.company_address,
      values.website_url,

      Number(s.trial_days),
      values.free_trial_enabled,
      values.yearly_billing_enabled,
      values.auto_expire_subscription,
      Number(s.grace_period_days),

      values.upi_id,
      values.gpay_number,
      values.payment_instructions,
      values.payment_approval_required,

      Number(s.password_min_length),
      Number(s.login_attempt_limit),
      Number(s.session_timeout),
      values.registration_enabled,
      values.maintenance_mode,

      values.new_user_alert,
      values.payment_alert,
      values.subscription_expiry_alert,
      values.trial_expiry_alert,

      values.terms_conditions,
      values.privacy_policy,
      values.refund_policy,
    ];

    await db.execute(sql, params);

    const [rows] = await db.execute(
      "SELECT * FROM system_settings WHERE id = 1"
    );

    return res.status(200).json({
      success: true,
      message: "System settings saved successfully",
      settings: rows[0],
    });
  } catch (error) {
    console.error("Update system settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save system settings",
    });
  }
};