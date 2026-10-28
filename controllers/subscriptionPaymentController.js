
const db = require("../config/db");

const PAYMENT_PLANS = {
  BASIC: {
    MONTHLY: 299,
    YEARLY: 2999,
  },
  PROFESSIONAL: {
    MONTHLY: 599,
    YEARLY: 5999,
  },
  BUSINESS: {
    MONTHLY: 999,
    YEARLY: 9999,
  },
};

// Reusable admin authorization check
const isAdmin = (req) =>
  String(req.user?.role || "").toLowerCase() === "admin";

// POST /api/subscription/payments
// Customer submits UTR after making a payment.
const submitPayment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const plan = String(req.body?.plan || "").trim().toUpperCase();
    const billingCycle = String(
      req.body?.billingCycle || ""
    ).trim().toUpperCase();
    const utrNumber = String(
      req.body?.utrNumber || ""
    ).trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    if (
      !Object.prototype.hasOwnProperty.call(PAYMENT_PLANS, plan) ||
      !["MONTHLY", "YEARLY"].includes(billingCycle)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan or billing cycle.",
      });
    }

    if (
      utrNumber.length < 8 ||
      utrNumber.length > 100 ||
      !/^[A-Za-z0-9-]+$/.test(utrNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid UTR / transaction reference number.",
      });
    }

    // Confirm that the customer exists.
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Confirm that the subscription record exists.
    const [subscriptions] = await db.query(
      `SELECT id, status
       FROM subscriptions
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!subscriptions.length) {
      return res.status(404).json({
        success: false,
        message: "Subscription record not found.",
      });
    }

    if (
      String(subscriptions[0].status || "").toUpperCase() ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message: "This subscription is cancelled. Please contact support.",
      });
    }

    // Never trust the amount sent by the frontend.
    const amount = PAYMENT_PLANS[plan][billingCycle];

    const [result] = await db.query(
      `INSERT INTO subscription_payments
        (user_id, plan_name, billing_cycle, amount, utr_number, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [userId, plan, billingCycle, amount, utrNumber]
    );

    return res.status(201).json({
      success: true,
      message:
        "Payment details submitted successfully. Your payment is pending admin verification.",
      payment: {
        id: result.insertId,
        plan,
        billingCycle,
        amount,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This UTR has already been submitted.",
      });
    }

    console.error("Submit payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit payment.",
    });
  }
};

// GET /api/subscription/payments/pending
// Admin views payments waiting for verification.
const getPendingPayments = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const [rows] = await db.query(
      `SELECT
          p.id,
          p.user_id,
          p.plan_name,
          p.billing_cycle,
          p.amount,
          p.utr_number,
          p.status,
          p.created_at,
          u.name,
          u.email
       FROM subscription_payments p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.status = 'PENDING'
       ORDER BY p.created_at ASC`
    );

    return res.status(200).json({
      success: true,
      payments: rows.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    });
  } catch (error) {
    console.error("Get pending payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load pending payments.",
    });
  }
};

// PUT /api/subscription/payments/:id/approve
// Admin must verify the actual bank/GPay transaction first.
const approvePayment = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const paymentId = Number(req.params.id);

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the payment to prevent duplicate approvals.
    const [payments] = await connection.query(
      `SELECT *
       FROM subscription_payments
       WHERE id = ?
       FOR UPDATE`,
      [paymentId]
    );

    if (!payments.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const payment = payments[0];

    if (payment.status !== "PENDING") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: `This payment has already been ${String(
          payment.status
        ).toLowerCase()}.`,
      });
    }

    // Lock the customer's subscription record.
    const [subscriptions] = await connection.query(
      `SELECT id, status, next_billing_date
       FROM subscriptions
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [payment.user_id]
    );

    if (!subscriptions.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Subscription record not found.",
      });
    }

    const cycle = String(payment.billing_cycle).toUpperCase();

    if (!["MONTHLY", "YEARLY"].includes(cycle)) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle on payment record.",
      });
    }

    // Fixed SQL interval values only; cycle is validated above.
    const interval = cycle === "YEARLY" ? "1 YEAR" : "1 MONTH";

    // Continue from the existing end date only when the paid
    // subscription is still active and has not expired.
    await connection.query(
      `UPDATE subscriptions
       SET next_billing_date = DATE_ADD(
             CASE
               WHEN status = 'ACTIVE'
                 AND next_billing_date IS NOT NULL
                 AND next_billing_date >= CURDATE()
               THEN next_billing_date
               ELSE CURDATE()
             END,
             INTERVAL ${interval}
           ),
           plan_name = ?,
           amount = ?,
           status = 'ACTIVE'
       WHERE user_id = ?`,
      [payment.plan_name, payment.amount, payment.user_id]
    );

    const [updatedSubscriptions] = await connection.query(
      `SELECT next_billing_date
       FROM subscriptions
       WHERE user_id = ?
       LIMIT 1`,
      [payment.user_id]
    );

    if (!updatedSubscriptions.length) {
      throw new Error("Unable to retrieve the updated subscription.");
    }

    const endDate = updatedSubscriptions[0].next_billing_date;

    // Synchronize the user record with the approved subscription.
    await connection.query(
      `UPDATE users
       SET plan = ?,
           subscription_status = 'ACTIVE',
           subscription_end_date = ?
       WHERE id = ?`,
      [payment.plan_name, endDate, payment.user_id]
    );

    // Mark the payment as approved only as part of this transaction.
    const [approvalResult] = await connection.query(
      `UPDATE subscription_payments
       SET status = 'APPROVED',
           verified_by = ?,
           verified_at = NOW()
       WHERE id = ?
         AND status = 'PENDING'`,
      [req.user.id, paymentId]
    );

    if (approvalResult.affectedRows !== 1) {
      throw new Error("Payment status changed before approval completed.");
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Payment approved and subscription activated.",
      subscription: {
        userId: payment.user_id,
        plan: payment.plan_name,
        amount: Number(payment.amount),
        billingCycle: cycle,
        status: "ACTIVE",
        endDate,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError);
      }
    }

    console.error("Approve payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve payment.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// PUT /api/subscription/payments/:id/reject
// Admin rejects a payment that could not be verified.
const rejectPayment = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const paymentId = Number(req.params.id);
    const adminNote = String(req.body?.adminNote || "").trim();

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (adminNote.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Admin note cannot exceed 500 characters.",
      });
    }

    const [result] = await db.query(
      `UPDATE subscription_payments
       SET status = 'REJECTED',
           admin_note = ?,
           verified_by = ?,
           verified_at = NOW()
       WHERE id = ?
         AND status = 'PENDING'`,
      [adminNote || null, req.user.id, paymentId]
    );

    if (result.affectedRows !== 1) {
      return res.status(404).json({
        success: false,
        message: "Pending payment not found, or it was already processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment rejected.",
    });
  } catch (error) {
    console.error("Reject payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject payment.",
    });
  }
};

module.exports = {
  submitPayment,
  getPendingPayments,
  approvePayment,
  rejectPayment,
};
