// const db = require("../config/db");

// const query = async (sql, params = []) => {
//   const [rows] = await db.execute(sql, params);
//   return rows;
// };

// // Dashboard
// exports.getDashboard = async (req, res) => {
//   try {
//     const [userStats] = await query(`
//       SELECT
//         COUNT(*) AS totalUsers,
//         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeUsers,
//         SUM(CASE WHEN subscription_status = 'TRIAL' THEN 1 ELSE 0 END) AS trialUsers,
//         SUM(CASE WHEN subscription_status = 'ACTIVE' THEN 1 ELSE 0 END) AS paidUsers,
//         SUM(CASE WHEN subscription_status = 'EXPIRED' THEN 1 ELSE 0 END) AS expiredUsers
//       FROM users
//       WHERE UPPER(role) <> 'SUPER_ADMIN'
//     `);

//     const [revenue] = await query(`
//       SELECT
//         COALESCE(SUM(
//           CASE
//             WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
//             THEN amount ELSE 0
//           END
//         ), 0) AS monthlyRevenue,
//         COALESCE(SUM(
//           CASE
//             WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01')
//             THEN amount ELSE 0
//           END
//         ), 0) AS yearlyRevenue
//       FROM subscription_payments
//       WHERE UPPER(status) = 'APPROVED'
//     `);

//     const recentUsers = await query(`
//       SELECT id, name, email, plan, subscription_status, is_active
//       FROM users
//       WHERE UPPER(role) <> 'SUPER_ADMIN'
//       ORDER BY created_at DESC
//       LIMIT 10
//     `);

//     res.json({
//       success: true,
//       stats: {
//         totalUsers: Number(userStats.totalUsers || 0),
//         activeUsers: Number(userStats.activeUsers || 0),
//         trialUsers: Number(userStats.trialUsers || 0),
//         paidUsers: Number(userStats.paidUsers || 0),
//         expiredUsers: Number(userStats.expiredUsers || 0),
//         monthlyRevenue: Number(revenue.monthlyRevenue || 0),
//         yearlyRevenue: Number(revenue.yearlyRevenue || 0),
//       },
//       recentUsers,
//     });
//   } catch (error) {
//     console.error("Dashboard error:", error);
//     res.status(500).json({ success: false, message: "Dashboard loading failed" });
//   }
// };

// // Users
// exports.getUsers = async (req, res) => {
//   try {
//     const search = String(req.query.search || "").trim();

//     const users = await query(
//       `SELECT id, name, email, role, is_active, plan,
//               subscription_status, trial_start_date, trial_end_date,
//               subscription_end_date, created_at
//        FROM users
//        WHERE UPPER(role) <> 'SUPER_ADMIN'
//        AND (
//          name LIKE ?
//          OR email LIKE ?
//        )
//        ORDER BY created_at DESC`,
//       [`%${search}%`, `%${search}%`]
//     );

//     res.json({ success: true, users });
//   } catch (error) {
//     console.error("Users error:", error);
//     res.status(500).json({ success: false, message: "Users loading failed" });
//   }
// };

// exports.updateUserStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { isActive } = req.body;

//     if (![true, false, 1, 0].includes(isActive)) {
//       return res.status(400).json({
//         success: false,
//         message: "isActive must be true or false",
//       });
//     }

//     const [result] = await db.execute(
//       `UPDATE users
//        SET is_active = ?
//        WHERE id = ? AND UPPER(role) <> 'SUPER_ADMIN'`,
//       [isActive ? 1 : 0, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found or cannot update admin account",
//       });
//     }

//     res.json({ success: true, message: "User status updated" });
//   } catch (error) {
//     console.error("Update user status error:", error);
//     res.status(500).json({ success: false, message: "User status update failed" });
//   }
// };

// // Businesses
// exports.getBusinesses = async (req, res) => {
//   try {
//     const businesses = await query(`
//       SELECT b.*, u.name AS owner_name, u.email AS owner_email
//       FROM businesses b
//       LEFT JOIN users u ON u.id = b.user_id
//       ORDER BY b.id DESC
//     `);

//     res.json({ success: true, businesses });
//   } catch (error) {
//     console.error("Businesses error:", error);
//     res.status(500).json({ success: false, message: "Businesses loading failed" });
//   }
// };

// // Subscriptions
// exports.getSubscriptions = async (req, res) => {
//   try {
//     const subscriptions = await query(`
//       SELECT s.*, u.name AS user_name, u.email AS user_email
//       FROM subscriptions s
//       LEFT JOIN users u ON u.id = s.user_id
//       ORDER BY s.created_at DESC
//     `);

//     res.json({ success: true, subscriptions });
//   } catch (error) {
//     console.error("Subscriptions error:", error);
//     res.status(500).json({ success: false, message: "Subscriptions loading failed" });
//   }
// };

// exports.updateSubscription = async (req, res) => {
//   const connection = await db.getConnection();

//   try {
//     const { userId } = req.params;
//     const { plan, status } = req.body;

//     const allowedPlans = ["BASIC", "PROFESSIONAL", "BUSINESS"];
//     const allowedStatuses = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"];

//     if (!allowedPlans.includes(String(plan).toUpperCase())) {
//       return res.status(400).json({ success: false, message: "Invalid plan" });
//     }

//     if (!allowedStatuses.includes(String(status).toUpperCase())) {
//       return res.status(400).json({ success: false, message: "Invalid status" });
//     }

//     await connection.beginTransaction();

//     await connection.execute(
//       `UPDATE subscriptions
//        SET plan_name = ?, status = ?, updated_at = NOW()
//        WHERE user_id = ?`,
//       [plan.toUpperCase(), status.toUpperCase(), userId]
//     );

//     await connection.execute(
//       `UPDATE users
//        SET plan = ?, subscription_status = ?
//        WHERE id = ?`,
//       [plan.toUpperCase(), status.toUpperCase(), userId]
//     );

//     await connection.commit();

//     res.json({ success: true, message: "Subscription updated" });
//   } catch (error) {
//     await connection.rollback();
//     console.error("Update subscription error:", error);
//     res.status(500).json({ success: false, message: "Subscription update failed" });
//   } finally {
//     connection.release();
//   }
// };

// // Payments
// exports.getPayments = async (req, res) => {
//   try {
//     const payments = await query(`
//       SELECT p.*, u.name AS user_name, u.email AS user_email
//       FROM subscription_payments p
//       LEFT JOIN users u ON u.id = p.user_id
//       ORDER BY p.created_at DESC
//     `);

//     res.json({ success: true, payments });
//   } catch (error) {
//     console.error("Payments error:", error);
//     res.status(500).json({ success: false, message: "Payments loading failed" });
//   }
// };

// exports.updatePaymentStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, admin_note } = req.body;

//     const normalizedStatus = String(status || "").toUpperCase();

//     if (!["APPROVED", "REJECTED", "PENDING"].includes(normalizedStatus)) {
//       return res.status(400).json({ success: false, message: "Invalid payment status" });
//     }

//     const [result] = await db.execute(
//       `UPDATE subscription_payments
//        SET status = ?,
//            admin_note = ?,
//            verified_by = ?,
//            verified_at = NOW()
//        WHERE id = ?`,
//       [normalizedStatus, admin_note || null, req.admin.id, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ success: false, message: "Payment not found" });
//     }

//     res.json({ success: true, message: "Payment status updated" });
//   } catch (error) {
//     console.error("Payment update error:", error);
//     res.status(500).json({ success: false, message: "Payment update failed" });
//   }
// };

// // Plans - read only summary
// exports.getPlans = async (req, res) => {
//   try {
//     const plans = await query(`
//       SELECT plan_name AS plan,
//              COUNT(*) AS total_subscriptions,
//              SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END) AS active_subscriptions,
//              MAX(amount) AS amount
//       FROM subscriptions
//       GROUP BY plan_name
//       ORDER BY plan_name
//     `);

//     res.json({ success: true, plans });
//   } catch (error) {
//     console.error("Plans error:", error);
//     res.status(500).json({ success: false, message: "Plans loading failed" });
//   }
// };

// // Trials
// exports.getTrials = async (req, res) => {
//   try {
//     const trials = await query(`
//       SELECT id, name, email, plan, subscription_status,
//              trial_start_date, trial_end_date
//       FROM users
//       WHERE UPPER(subscription_status) = 'TRIAL'
//       ORDER BY trial_end_date ASC
//     `);

//     res.json({ success: true, trials });
//   } catch (error) {
//     console.error("Trials error:", error);
//     res.status(500).json({ success: false, message: "Trials loading failed" });
//   }
// };

// exports.extendTrial = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const days = Number(req.body.days);

//     if (!Number.isInteger(days) || days < 1 || days > 365) {
//       return res.status(400).json({
//         success: false,
//         message: "Trial extension must be between 1 and 365 days",
//       });
//     }

//     const [result] = await db.execute(
//       `UPDATE users
//        SET trial_end_date = DATE_ADD(
//          CASE
//            WHEN trial_end_date IS NULL OR trial_end_date < NOW()
//            THEN NOW()
//            ELSE trial_end_date
//          END,
//          INTERVAL ? DAY
//        )
//        WHERE id = ? AND UPPER(subscription_status) = 'TRIAL'`,
//       [days, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ success: false, message: "Active trial user not found" });
//     }

//     res.json({ success: true, message: "Trial extended successfully" });
//   } catch (error) {
//     console.error("Trial extension error:", error);
//     res.status(500).json({ success: false, message: "Trial extension failed" });
//   }
// };

// // Monthly revenue report
// exports.getReports = async (req, res) => {
//   try {
//     const reports = await query(`
//       SELECT
//         DATE_FORMAT(created_at, '%Y-%m') AS month,
//         COALESCE(SUM(amount), 0) AS revenue,
//         COUNT(*) AS total_payments
//       FROM subscription_payments
//       WHERE UPPER(status) = 'APPROVED'
//       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
//       ORDER BY month DESC
//       LIMIT 12
//     `);

//     res.json({ success: true, reports: reports.reverse() });
//   } catch (error) {
//     console.error("Reports error:", error);
//     res.status(500).json({ success: false, message: "Reports loading failed" });
//   }
// };

// // Not implemented: no matching database tables yet
// exports.notImplemented = (req, res) => {
//   res.status(501).json({
//     success: false,
//     message: "This feature is not configured in the database yet",
//   });
// };

const db = require("../config/db");

const query = async (sql, params = []) => {
  const [rows] = await db.execute(sql, params);
  return rows;
};

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [userStats] = await query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeUsers,
        SUM(CASE WHEN subscription_status = 'TRIAL' THEN 1 ELSE 0 END) AS trialUsers,
        SUM(CASE WHEN subscription_status = 'ACTIVE' THEN 1 ELSE 0 END) AS paidUsers,
        SUM(CASE WHEN subscription_status = 'EXPIRED' THEN 1 ELSE 0 END) AS expiredUsers
      FROM users
      WHERE UPPER(role) <> 'SUPER_ADMIN'
    `);

    const [revenue] = await query(`
      SELECT
        COALESCE(SUM(CASE
          WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          THEN amount ELSE 0 END), 0) AS monthlyRevenue,
        COALESCE(SUM(CASE
          WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01')
          THEN amount ELSE 0 END), 0) AS yearlyRevenue
      FROM subscription_payments
      WHERE UPPER(status) = 'APPROVED'
    `);

    const recentUsers = await query(`
      SELECT id, name, email, plan, subscription_status, is_active
      FROM users
      WHERE UPPER(role) <> 'SUPER_ADMIN'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        totalUsers: Number(userStats.totalUsers || 0),
        activeUsers: Number(userStats.activeUsers || 0),
        trialUsers: Number(userStats.trialUsers || 0),
        paidUsers: Number(userStats.paidUsers || 0),
        expiredUsers: Number(userStats.expiredUsers || 0),
        monthlyRevenue: Number(revenue.monthlyRevenue || 0),
        yearlyRevenue: Number(revenue.yearlyRevenue || 0),
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Dashboard loading failed",
    });
  }
};

// Users
exports.getUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const users = await query(
      `SELECT id, name, email, role, is_active, plan,
              subscription_status, trial_start_date, trial_end_date,
              subscription_end_date, created_at
       FROM users
       WHERE UPPER(role) <> 'SUPER_ADMIN'
       AND (name LIKE ? OR email LIKE ?)
       ORDER BY created_at DESC`,
      [`%${search}%`, `%${search}%`]
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("Users error:", error);
    res.status(500).json({
      success: false,
      message: "Users loading failed",
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (![true, false, 1, 0].includes(isActive)) {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const [result] = await db.execute(
      `UPDATE users
       SET is_active = ?
       WHERE id = ? AND UPPER(role) <> 'SUPER_ADMIN'`,
      [isActive ? 1 : 0, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found or cannot update admin account",
      });
    }

    res.json({ success: true, message: "User status updated" });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "User status update failed",
    });
  }
};

// Businesses
exports.getBusinesses = async (req, res) => {
  try {
    const businesses = await query(`
      SELECT b.*, u.name AS owner_name, u.email AS owner_email
      FROM businesses b
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY b.id DESC
    `);

    res.json({ success: true, businesses });
  } catch (error) {
    console.error("Businesses error:", error);
    res.status(500).json({
      success: false,
      message: "Businesses loading failed",
    });
  }
};

// Subscriptions
exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await query(`
      SELECT s.*, u.name AS user_name, u.email AS user_email
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);

    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error("Subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Subscriptions loading failed",
    });
  }
};

exports.updateSubscription = async (req, res) => {
  let connection;

  try {
    const { userId } = req.params;
    const { plan, status } = req.body;

    const normalizedPlan = String(plan || "").toUpperCase();
    const normalizedStatus = String(status || "").toUpperCase();

    const allowedPlans = ["BASIC", "PROFESSIONAL", "BUSINESS"];
    const allowedStatuses = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"];

    if (!allowedPlans.includes(normalizedPlan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan",
      });
    }

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE subscriptions
       SET plan_name = ?, status = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [normalizedPlan, normalizedStatus, userId]
    );

    await connection.execute(
      `UPDATE users
       SET plan = ?, subscription_status = ?
       WHERE id = ?`,
      [normalizedPlan, normalizedStatus, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Subscription updated",
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Update subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Subscription update failed",
    });
  } finally {
    if (connection) connection.release();
  }
};

// Payments
exports.getPayments = async (req, res) => {
  try {
    const payments = await query(`
      SELECT p.*, u.name AS user_name, u.email AS user_email
      FROM subscription_payments p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);

    res.json({ success: true, payments });
  } catch (error) {
    console.error("Payments error:", error);
    res.status(500).json({
      success: false,
      message: "Payments loading failed",
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;

    const normalizedStatus = String(status || "").toUpperCase();

    if (!["APPROVED", "REJECTED", "PENDING"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const [result] = await db.execute(
      `UPDATE subscription_payments
       SET status = ?,
           admin_note = ?,
           verified_by = ?,
           verified_at = NOW()
       WHERE id = ?`,
      [normalizedStatus, admin_note || null, req.admin.id, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      message: "Payment status updated",
    });
  } catch (error) {
    console.error("Payment update error:", error);
    res.status(500).json({
      success: false,
      message: "Payment update failed",
    });
  }
};

// Plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await query(`
      SELECT plan_name AS plan,
             COUNT(*) AS total_subscriptions,
             SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END) AS active_subscriptions,
             MAX(amount) AS amount
      FROM subscriptions
      GROUP BY plan_name
      ORDER BY plan_name
    `);

    res.json({ success: true, plans });
  } catch (error) {
    console.error("Plans error:", error);
    res.status(500).json({
      success: false,
      message: "Plans loading failed",
    });
  }
};

// Trials
exports.getTrials = async (req, res) => {
  try {
    const trials = await query(`
      SELECT id, name, email, plan, subscription_status,
             trial_start_date, trial_end_date
      FROM users
      WHERE UPPER(subscription_status) = 'TRIAL'
      ORDER BY trial_end_date ASC
    `);

    res.json({ success: true, trials });
  } catch (error) {
    console.error("Trials error:", error);
    res.status(500).json({
      success: false,
      message: "Trials loading failed",
    });
  }
};

exports.extendTrial = async (req, res) => {
  try {
    const { id } = req.params;
    const days = Number(req.body.days);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Trial extension must be between 1 and 365 days",
      });
    }

    const [result] = await db.execute(
      `UPDATE users
       SET trial_end_date = DATE_ADD(
         CASE
           WHEN trial_end_date IS NULL OR trial_end_date < NOW()
           THEN NOW()
           ELSE trial_end_date
         END,
         INTERVAL ? DAY
       )
       WHERE id = ? AND UPPER(subscription_status) = 'TRIAL'`,
      [days, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Active trial user not found",
      });
    }

    res.json({
      success: true,
      message: "Trial extended successfully",
    });
  } catch (error) {
    console.error("Trial extension error:", error);
    res.status(500).json({
      success: false,
      message: "Trial extension failed",
    });
  }
};

// Reports

// Revenue Reports
exports.getReports = async (req, res) => {
  try {
    const reports = await query(`
      SELECT
        MONTH(created_at) AS month_number,
        MONTHNAME(created_at) AS month,
        YEAR(created_at) AS year,
        DATE_FORMAT(created_at, '%Y-%m') AS month_year,
        COALESCE(SUM(amount), 0) AS revenue,
        COUNT(*) AS total_payments
      FROM subscription_payments
      WHERE UPPER(status) = 'APPROVED'
      GROUP BY
        YEAR(created_at),
        MONTH(created_at),
        MONTHNAME(created_at)
      ORDER BY
        YEAR(created_at) ASC,
        MONTH(created_at) ASC
    `);

    const formattedReports = reports.map((item) => ({
      month: item.month,
      year: Number(item.year),
      month_number: Number(item.month_number),
      month_year: item.month_year,
      revenue: Number(item.revenue || 0),
      total_payments: Number(item.total_payments || 0),
    }));

    res.json({
      success: true,
      reports: formattedReports,
      monthly: formattedReports,
    });
  } catch (error) {
    console.error("Revenue Reports Error:", error);

    res.status(500).json({
      success: false,
      message: "Reports loading failed",
    });
  }
};


// Login Activity
exports.getLoginActivity = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim().toUpperCase();

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(
        email LIKE ?
        OR role LIKE ?
        OR ip_address LIKE ?
      )`);

      const value = `%${search}%`;
      params.push(value, value, value);
    }

    if (["SUCCESS", "FAILED"].includes(status)) {
      conditions.push("login_status = ?");
      params.push(status);
    }

    const whereSQL = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const activities = await query(
      `SELECT
        id, user_id, business_id, email, role,
        login_status, ip_address, device_info,
        failure_reason, login_at
       FROM login_activity
       ${whereSQL}
       ORDER BY login_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM login_activity
       ${whereSQL}`,
      params
    );

    const statsResult = await query(`
      SELECT
        COUNT(*) AS totalAttempts,
        SUM(CASE WHEN login_status = 'SUCCESS' THEN 1 ELSE 0 END) AS successfulLogins,
        SUM(CASE WHEN login_status = 'FAILED' THEN 1 ELSE 0 END) AS failedLogins
      FROM login_activity
    `);

    const total = Number(countResult[0]?.total || 0);
    const stats = statsResult[0] || {};

    res.json({
      success: true,
      activities,
      stats: {
        totalAttempts: Number(stats.totalAttempts || 0),
        successfulLogins: Number(stats.successfulLogins || 0),
        failedLogins: Number(stats.failedLogins || 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Login activity error:", error);
    res.status(500).json({
      success: false,
      message: "Login activity loading failed",
    });
  }
};

// Other features not configured yet
exports.notImplemented = (req, res) => {
  res.status(501).json({
    success: false,
    message: "This feature is not configured in the database yet",
  });
};
