const db = require("../config/db");

const PLANS = {
  BASIC: 299,
  PROFESSIONAL: 599,
  BUSINESS: 999,
};

// 1. Admin Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [[users]] = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(is_active = 1), 0) AS activeUsers,
        COALESCE(SUM(is_active = 0), 0) AS inactiveUsers,
        COALESCE(SUM(UPPER(subscription_status) = 'TRIAL'), 0) AS trialUsers,
        COALESCE(SUM(UPPER(subscription_status) = 'EXPIRED'), 0) AS expiredUsers
      FROM users
    `);

    const [[subs]] = await db.query(`
      SELECT
        COUNT(*) AS totalSubscriptions,
        COALESCE(SUM(UPPER(status) = 'ACTIVE'), 0) AS activeSubscriptions,
        COALESCE(SUM(UPPER(status) = 'TRIAL'), 0) AS trialSubscriptions,
        COALESCE(SUM(UPPER(status) = 'EXPIRED'), 0) AS expiredSubscriptions,
        COALESCE(
          SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN amount ELSE 0 END),
          0
        ) AS monthlyActiveAmount
      FROM subscriptions
    `);

    const [recentUsers] = await db.query(`
      SELECT id, business_id, name, email, role, is_active,
             subscription_status, plan, trial_end_date, created_at
      FROM users
      ORDER BY id DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      stats: { ...users, ...subs },
      recentUsers,
    });
  } catch (error) {
    console.error("getDashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard",
    });
  }
};

// 2. Users and Businesses
exports.getUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const params = [];
    let where = "WHERE 1 = 1";

    if (search) {
      where += ` AND (
        CAST(u.id AS CHAR) LIKE ?
        OR u.name LIKE ?
        OR u.email LIKE ?
        OR CAST(u.business_id AS CHAR) LIKE ?
      )`;

      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const [users] = await db.query(
      `SELECT
        u.id, u.business_id, u.name, u.email, u.role, u.is_active,
        u.subscription_status, u.plan, u.trial_start_date,
        u.trial_end_date, u.subscription_end_date, u.created_at,
        s.plan_name, s.amount, s.status AS subscription_record_status,
        s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ${where}
      ORDER BY u.id DESC
      LIMIT 500`,
      params
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("getUsers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
};

// 3. Activate / Deactivate account
exports.updateUserStatus = async (req, res) => {
  const userId = Number(req.params.id);
  const { isActive } = req.body;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    typeof isActive !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid user ID and isActive value are required",
    });
  }

  if (userId === Number(req.admin.id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot deactivate your own admin account",
    });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET is_active = ? WHERE id = ?",
      [isActive ? 1 : 0, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: `Account ${isActive ? "activated" : "deactivated"} successfully`,
      is_active: isActive ? 1 : 0,
    });
  } catch (error) {
    console.error("updateUserStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update account status",
    });
  }
};

// 4. Subscription list
exports.getSubscriptions = async (req, res) => {
  try {
    const [subscriptions] = await db.query(`
      SELECT
        s.id AS subscription_id,
        s.user_id,
        u.name,
        u.email,
        u.business_id,
        s.plan_name,
        s.amount,
        s.status,
        s.trial_start_date,
        s.trial_end_date,
        s.next_billing_date,
        u.is_active
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
      LIMIT 500
    `);

    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error("getSubscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load subscriptions",
    });
  }
};

// 5. Admin updates subscription plan/status
exports.updateSubscription = async (req, res) => {
  const userId = Number(req.params.userId);
  const plan = String(req.body.plan || "").toUpperCase();
  const status = String(req.body.status || "").toUpperCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subscription plan",
    });
  }

  if (!["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subscription status",
    });
  }

  try {
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [records] = await db.query(
      "SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "Subscription record not found for this user",
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE subscriptions
         SET plan_name = ?, amount = ?, status = ?
         WHERE user_id = ?`,
        [plan, PLANS[plan], status, userId]
      );

      await connection.query(
        `UPDATE users
         SET plan = ?, subscription_status = ?
         WHERE id = ?`,
        [plan, status, userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      message: "Subscription updated successfully",
      plan,
      amount: PLANS[plan],
      status,
    });
  } catch (error) {
    console.error("updateSubscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};

// 6. Reports
exports.getReports = async (req, res) => {
  try {
    const [planBreakdown] = await db.query(`
      SELECT
        plan_name AS plan,
        UPPER(status) AS status,
        COUNT(*) AS total,
        COALESCE(SUM(amount), 0) AS amount
      FROM subscriptions
      GROUP BY plan_name, UPPER(status)
      ORDER BY plan_name
    `);

    const [monthlyRegistrations] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);

    const [[summary]] = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(is_active = 1), 0) AS activeUsers,
        COALESCE(SUM(is_active = 0), 0) AS inactiveUsers
      FROM users
    `);

    res.json({
      success: true,
      summary,
      planBreakdown,
      monthlyRegistrations,
    });
  } catch (error) {
    console.error("getReports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load reports",
    });
  }
};