

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../config/db");
const { JWT_SECRET } = require("../config/env");

// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return res.status(400).json({
        message: "Enter valid details. Password must be at least 6 characters.",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users
        (
          name,
          email,
          password,
          trial_start_date,
          trial_end_date,
          subscription_status,
          plan,
          role,
          is_active
        )
       VALUES (?, ?, ?, CURDATE(),
          DATE_ADD(CURDATE(), INTERVAL 30 DAY),
          'TRIAL', 'FREE_TRIAL', 'USER', 1)`,
      [cleanName, cleanEmail, hashedPassword]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      {
        id: userId,
        userId,
        role: "USER",
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: "USER",
        subscriptionStatus: "TRIAL",
        plan: "FREE_TRIAL",
      },
      trialDays: 30,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
};

// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Get user and actual role from MySQL
    const [users] = await db.query(
      `SELECT
        id,
        business_id,
        name,
        email,
        password,
        role,
        is_active,
        trial_start_date,
        trial_end_date,
        subscription_status,
        plan,
        subscription_end_date
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Block deactivated accounts
    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        message: "Your account is deactivated.",
      });
    }

    const role = String(user.role || "USER").toUpperCase();
    const isAdmin = role === "ADMIN";

    let currentStatus = user.subscription_status;
    let accessAllowed = false;

    // =================================================
    // ADMIN: BYPASS TRIAL / SUBSCRIPTION EXPIRY
    // =================================================

    if (isAdmin) {
      accessAllowed = true;
      currentStatus = "ACTIVE";

      // Keep Admin status ACTIVE.
      // Admin must not be marked EXPIRED by trial checks.
      if (user.subscription_status !== "ACTIVE") {
        await db.query(
          `UPDATE users
           SET subscription_status = 'ACTIVE'
           WHERE id = ? AND role = 'ADMIN'`,
          [user.id]
        );
      }
    } else {
      // =================================================
      // NORMAL USER: TRIAL / SUBSCRIPTION VALIDATION
      // =================================================

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let trialEndDate = null;

      if (user.trial_end_date) {
        trialEndDate = new Date(user.trial_end_date);
        trialEndDate.setHours(0, 0, 0, 0);
      }

      // Trial is still valid
      if (trialEndDate && today <= trialEndDate) {
        accessAllowed = true;
        currentStatus = "TRIAL";

        if (user.subscription_status !== "TRIAL") {
          await db.query(
            `UPDATE users
             SET subscription_status = 'TRIAL'
             WHERE id = ? AND role <> 'ADMIN'`,
            [user.id]
          );
        }
      } else {
        // Trial ended: check paid/active subscription
        let subscriptionEndDate = null;

        if (user.subscription_end_date) {
          subscriptionEndDate = new Date(
            user.subscription_end_date
          );
          subscriptionEndDate.setHours(0, 0, 0, 0);
        }

        if (
          user.subscription_status === "ACTIVE" &&
          subscriptionEndDate &&
          today <= subscriptionEndDate
        ) {
          accessAllowed = true;
          currentStatus = "ACTIVE";
        } else {
          accessAllowed = false;
          currentStatus = "EXPIRED";

          await db.query(
            `UPDATE users
             SET subscription_status = 'EXPIRED'
             WHERE id = ? AND role <> 'ADMIN'`,
            [user.id]
          );
        }
      }
    }

    // Block expired regular users only
    if (!accessAllowed) {
      return res.status(403).json({
        message:
          "Your free trial has expired. Please subscribe to continue.",
        status: "TRIAL_EXPIRED",
        subscription_status: "EXPIRED",
      });
    }

    // =================================================
    // CREATE JWT WITH DATABASE ROLE
    // =================================================

    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        businessId: user.business_id || null,
        role,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // =================================================
    // LOGIN SUCCESS
    // =================================================

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        businessId: user.business_id || null,
        name: user.name,
        email: user.email,
        role,
        trialStartDate: user.trial_start_date,
        trialEndDate: user.trial_end_date,
        subscriptionStatus: currentStatus,
        plan: user.plan,
        subscriptionEndDate: user.subscription_end_date,
        business: null,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  register,
  login,
};
