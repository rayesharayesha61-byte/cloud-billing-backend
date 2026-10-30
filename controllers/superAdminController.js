
const db = require("../config/db");

const PLAN_PRICES = {
  BASIC: 299,
  PROFESSIONAL: 599,
  BUSINESS: 999,
};

const sendError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({
    success: false,
    message,
    error: error.message,
  });
};

const unavailable = (res, feature) => {
  return res.status(501).json({
    success: false,
    message: `${feature} is not available in the existing database structure.`,
  });
};

// DASHBOARD
exports.getDashboard = async (req, res) => {
  try {
    const [[users]] = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(is_active = 1), 0) AS activeUsers,
        COALESCE(SUM(subscription_status = 'TRIAL'), 0) AS trialUsers,
        COALESCE(SUM(subscription_status = 'EXPIRED'), 0) AS expiredUsers
      FROM users
      WHERE UPPER(role) NOT IN ('ADMIN', 'SUPER_ADMIN')
    `);

    const [[paid]] = await db.query(`
      SELECT COUNT(DISTINCT s.user_id) AS paidUsers
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.status = 'ACTIVE'
      AND UPPER(u.role) NOT IN ('ADMIN', 'SUPER_ADMIN')
    `);

    const [[revenue]] = await db.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN verified_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          THEN amount ELSE 0 END
        ), 0) AS monthlyRevenue,

        COALESCE(SUM(
          CASE WHEN YEAR(verified_at) = YEAR(CURDATE())
          THEN amount ELSE 0 END
        ), 0) AS yearlyRevenue

      FROM subscription_payments
      WHERE status = 'APPROVED'
    `);

    const [recentUsers] = await db.query(`
      SELECT id, name, email, role, is_active,
             subscription_status, plan, created_at
      FROM users
      WHERE UPPER(role) NOT IN ('ADMIN', 'SUPER_ADMIN')
      ORDER BY id DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      stats: {
        ...users,
        ...paid,
        ...revenue,
      },
      recentUsers,
    });
  } catch (error) {
    sendError(res, error, "Failed to load dashboard");
  }
};

// USERS
exports.getUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    let where = `
      WHERE UPPER(u.role) NOT IN ('ADMIN', 'SUPER_ADMIN')
    `;

    const params = [];

    if (search) {
      where += `
        AND (
          u.name LIKE ?
          OR u.email LIKE ?
          OR CAST(u.id AS CHAR) LIKE ?
        )
      `;

      const value = `%${search}%`;
      params.push(value, value, value);
    }

    const [users] = await db.query(`
      SELECT
        u.id,
        u.business_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.plan,
        u.subscription_status,
        u.trial_start_date,
        u.trial_end_date,
        u.subscription_end_date,
        u.created_at
      FROM users u
      ${where}
      ORDER BY u.id DESC
      LIMIT 500
    `, params);

    res.json({ success: true, users });
  } catch (error) {
    sendError(res, error, "Failed to load users");
  }
};

// ACTIVATE / DEACTIVATE USER
exports.updateUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or status",
      });
    }

    const [result] = await db.query(`
      UPDATE users
      SET is_active = ?
      WHERE id = ?
      AND UPPER(role) NOT IN ('ADMIN', 'SUPER_ADMIN')
    `, [isActive ? 1 : 0, id]);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User status updated",
    });
  } catch (error) {
    sendError(res, error, "Failed to update user");
  }
};

// BUSINESSES
exports.getBusinesses = async (req, res) => {
  try {
    const [businesses] = await db.query(`
      SELECT
        b.*,
        u.name AS user_name,
        u.email AS user_email,
        u.subscription_status,
        u.is_active
      FROM businesses b
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY b.id DESC
      LIMIT 500
    `);

    res.json({ success: true, businesses });
  } catch (error) {
    sendError(res, error, "Failed to load businesses");
  }
};

// SUBSCRIPTIONS
exports.getSubscriptions = async (req, res) => {
  try {
    const [subscriptions] = await db.query(`
      SELECT
        s.*,
        u.name,
        u.email,
        u.business_id,
        u.is_active
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
      LIMIT 500
    `);

    res.json({ success: true, subscriptions });
  } catch (error) {
    sendError(res, error, "Failed to load subscriptions");
  }
};

// UPDATE SUBSCRIPTION
exports.updateSubscription = async (req, res) => {
  let connection;

  try {
    const userId = Number(req.params.userId);
    const plan = String(req.body.plan || "").toUpperCase();
    const status = String(req.body.status || "").toUpperCase();

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !PLAN_PRICES[plan] ||
      !["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID, plan or status",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(`
      SELECT id
      FROM users
      WHERE id = ?
      AND UPPER(role) NOT IN ('ADMIN', 'SUPER_ADMIN')
    `, [userId]);

    if (!users.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [subscriptions] = await connection.query(
      "SELECT id FROM subscriptions WHERE user_id = ?",
      [userId]
    );

    if (!subscriptions.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    await connection.query(`
      UPDATE subscriptions
      SET plan_name = ?, amount = ?, status = ?
      WHERE user_id = ?
    `, [plan, PLAN_PRICES[plan], status, userId]);

    // users.subscription_status does not support CANCELLED.
    // Keep CANCELLED only in subscriptions table.
    const userStatus = status === "CANCELLED" ? "EXPIRED" : status;

    await connection.query(`
      UPDATE users
      SET plan = ?, subscription_status = ?
      WHERE id = ?
    `, [plan, userStatus, userId]);

    await connection.commit();

    res.json({
      success: true,
      message: "Subscription updated",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    sendError(res, error, "Failed to update subscription");
  } finally {
    if (connection) connection.release();
  }
};

// PLANS - READ EXISTING SUBSCRIPTION PLANS
exports.getPlans = async (req, res) => {
  try {
    const [plans] = await db.query(`
      SELECT
        plan_name,
        amount,
        COUNT(*) AS total_subscriptions
      FROM subscriptions
      GROUP BY plan_name, amount
      ORDER BY amount
    `);

    res.json({ success: true, plans });
  } catch (error) {
    sendError(res, error, "Failed to load plans");
  }
};

// No separate plans table exists.
exports.createPlan = async (req, res) => unavailable(res, "Plan creation");
exports.updatePlan = async (req, res) => unavailable(res, "Plan editing");

// PAYMENT HISTORY
exports.getPayments = async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT
        p.*,
        u.name,
        u.email
      FROM subscription_payments p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.id DESC
      LIMIT 500
    `);

    res.json({ success: true, payments });
  } catch (error) {
    sendError(res, error, "Failed to load payment history");
  }
};

// APPROVE / REJECT PAYMENT
exports.updatePaymentStatus = async (req, res) => {
  try {
    const paymentId = Number(req.params.id);
    const status = String(req.body.status || "").toUpperCase();
    const adminNote = String(req.body.admin_note || "");

    if (
      !Number.isInteger(paymentId) ||
      paymentId <= 0 ||
      !["APPROVED", "REJECTED"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID or status",
      });
    }

    const [result] = await db.query(`
      UPDATE subscription_payments
      SET status = ?,
          admin_note = ?,
          verified_by = ?,
          verified_at = NOW()
      WHERE id = ?
      AND status = 'PENDING'
    `, [status, adminNote, req.admin.id, paymentId]);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Pending payment not found",
      });
    }

    res.json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    sendError(res, error, "Failed to update payment");
  }
};

// TRIALS
exports.getTrials = async (req, res) => {
  try {
    const [trials] = await db.query(`
      SELECT
        id,
        name,
        email,
        plan,
        trial_start_date,
        trial_end_date,
        subscription_status
      FROM users
      WHERE subscription_status = 'TRIAL'
      ORDER BY trial_end_date
    `);

    res.json({ success: true, trials });
  } catch (error) {
    sendError(res, error, "Failed to load trials");
  }
};

// EXTEND TRIAL
exports.updateTrial = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const days = Number(req.body.days);

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 365
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid user ID and trial extension",
      });
    }

    const [result] = await db.query(`
      UPDATE users
      SET trial_end_date = DATE_ADD(
        GREATEST(COALESCE(trial_end_date, CURDATE()), CURDATE()),
        INTERVAL ? DAY
      )
      WHERE id = ?
      AND subscription_status = 'TRIAL'
    `, [days, id]);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Trial user not found",
      });
    }

    await db.query(`
      UPDATE subscriptions
      SET trial_end_date = (
        SELECT trial_end_date FROM users WHERE id = ?
      )
      WHERE user_id = ?
    `, [id, id]);

    res.json({
      success: true,
      message: "Trial extended",
    });
  } catch (error) {
    sendError(res, error, "Failed to extend trial");
  }
};

// REPORTS
exports.getReports = async (req, res) => {
  try {
    const [monthly] = await db.query(`
      SELECT
        DATE_FORMAT(verified_at, '%Y-%m') AS month,
        SUM(amount) AS revenue
      FROM subscription_payments
      WHERE status = 'APPROVED'
      AND verified_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(verified_at, '%Y-%m')
      ORDER BY month
    `);

    const [plans] = await db.query(`
      SELECT
        plan_name,
        status,
        COUNT(*) AS total,
        SUM(amount) AS amount
      FROM subscriptions
      GROUP BY plan_name, status
    `);

    res.json({ success: true, monthly, plans });
  } catch (error) {
    sendError(res, error, "Failed to load reports");
  }
};

// FEATURES WITHOUT EXISTING TABLES
exports.getCoupons = async (req, res) => unavailable(res, "Coupons");
exports.createCoupon = async (req, res) => unavailable(res, "Coupon creation");
exports.updateCoupon = async (req, res) => unavailable(res, "Coupon editing");

exports.getNotifications = async (req, res) => unavailable(res, "Notifications");
exports.createNotification = async (req, res) => unavailable(res, "Notifications");

exports.getTickets = async (req, res) => unavailable(res, "Support tickets");
exports.updateTicket = async (req, res) => unavailable(res, "Support tickets");

exports.getLoginActivity = async (req, res) => unavailable(res, "Login activity");

exports.getSettings = async (req, res) => unavailable(res, "System settings");
exports.updateSettings = async (req, res) => unavailable(res, "System settings");
