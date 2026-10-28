
const db = require("../config/db");

const PLANS = {
  BASIC: 299,
  PROFESSIONAL: 599,
  BUSINESS: 999,
};

// GET /api/subscription
const getSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // Check whether the user's trial or paid subscription has expired.
    await db.query(
      `UPDATE users
       SET subscription_status = 'EXPIRED'
       WHERE id = ?
         AND (
           (subscription_status = 'TRIAL'
            AND trial_end_date < CURDATE())
           OR
           (subscription_status = 'ACTIVE'
            AND subscription_end_date IS NOT NULL
            AND subscription_end_date < CURDATE())
         )`,
      [userId]
    );

    // Keep the subscriptions table status synchronized.
    await db.query(
      `UPDATE subscriptions
       SET status = 'EXPIRED'
       WHERE user_id = ?
         AND (
           (status = 'TRIAL'
            AND trial_end_date IS NOT NULL
            AND trial_end_date < CURDATE())
           OR
           (status = 'ACTIVE'
            AND next_billing_date IS NOT NULL
            AND next_billing_date < CURDATE())
         )`,
      [userId]
    );

    // Get subscription information from both tables.
    const [rows] = await db.query(
      `SELECT
         u.id AS user_id,
         u.name,
         u.email,
         u.trial_start_date AS user_trial_start_date,
         u.trial_end_date AS user_trial_end_date,
         u.subscription_status AS user_status,
         u.plan AS user_plan,
         u.subscription_end_date,
         s.id AS subscription_id,
         s.plan_name,
         s.amount,
         s.status AS subscription_status,
         s.trial_start_date,
         s.trial_end_date,
         s.next_billing_date,
         s.created_at,
         s.updated_at
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = rows[0];

    if (!data.subscription_id) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription record not found. Please create the subscription record first.",
      });
    }

    return res.status(200).json({
      success: true,
      subscription: {
        id: data.subscription_id,
        user_id: data.user_id,
        name: data.name,
        email: data.email,

        plan_name: data.plan_name,
        plan: data.user_plan,
        amount: Number(data.amount),

        status: data.user_status,
        subscription_status: data.subscription_status,

        trial_start_date:
          data.user_trial_start_date || data.trial_start_date,

        trial_end_date:
          data.user_trial_end_date || data.trial_end_date,

        subscription_end_date: data.subscription_end_date,
        next_billing_date: data.next_billing_date,

        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
    });
  }
};

// PUT /api/subscription
// Select a plan. This does NOT confirm payment or activate a paid plan.
const changePlan = async (req, res) => {
  try {
    const userId = req.user?.id;

    const selectedPlan = String(req.body?.plan || "").toUpperCase();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!Object.prototype.hasOwnProperty.call(PLANS, selectedPlan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
        availablePlans: Object.keys(PLANS),
      });
    }

    // Confirm that the user exists.
    const [users] = await db.query(
      `SELECT id, subscription_status
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Confirm that the subscription record exists.
    const [subscriptions] = await db.query(
      `SELECT id, status
       FROM subscriptions
       WHERE user_id = ?`,
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (
      users[0].subscription_status === "CANCELLED" ||
      subscriptions[0].status === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This subscription is cancelled. Please contact support to renew.",
      });
    }

    const amount = PLANS[selectedPlan];

    // Update the selected plan in both tables.
    // Do not change the status to ACTIVE without verified payment.
    await db.query(
      `UPDATE subscriptions
       SET plan_name = ?, amount = ?
       WHERE user_id = ?`,
      [selectedPlan, amount, userId]
    );

    await db.query(
      `UPDATE users
       SET plan = ?
       WHERE id = ?`,
      [selectedPlan, userId]
    );

    // Return the updated information.
    const [updatedRows] = await db.query(
      `SELECT
         u.id AS user_id,
         u.plan,
         u.subscription_status AS user_status,
         u.trial_start_date,
         u.trial_end_date,
         u.subscription_end_date,
         s.id AS subscription_id,
         s.plan_name,
         s.amount,
         s.status AS subscription_status,
         s.next_billing_date
       FROM users u
       INNER JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message:
        "Plan selected successfully. Complete and verify payment to activate the paid subscription.",
      subscription: {
        ...updatedRows[0],
        amount: Number(updatedRows[0].amount),
      },
    });
  } catch (error) {
    console.error("Change subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};

module.exports = {
  getSubscription,
  changePlan,
};
