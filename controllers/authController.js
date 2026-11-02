

// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// const db = require("../config/db");
// const { JWT_SECRET } = require("../config/env");

// // =====================================================
// // REGISTER
// // =====================================================

// const register = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         message: "Name, email and password are required.",
//       });
//     }

//     if (
//       typeof name !== "string" ||
//       typeof email !== "string" ||
//       typeof password !== "string" ||
//       password.length < 6
//     ) {
//       return res.status(400).json({
//         message: "Enter valid details. Password must be at least 6 characters.",
//       });
//     }

//     if (!JWT_SECRET) {
//       return res.status(500).json({
//         message: "Server configuration error.",
//       });
//     }

//     const cleanName = name.trim();
//     const cleanEmail = email.trim().toLowerCase();

//     const [existingUsers] = await db.query(
//       "SELECT id FROM users WHERE email = ? LIMIT 1",
//       [cleanEmail]
//     );

//     if (existingUsers.length > 0) {
//       return res.status(409).json({
//         message: "An account with this email already exists.",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const [result] = await db.query(
//       `INSERT INTO users
//         (
//           name,
//           email,
//           password,
//           trial_start_date,
//           trial_end_date,
//           subscription_status,
//           plan,
//           role,
//           is_active
//         )
//        VALUES (?, ?, ?, CURDATE(),
//           DATE_ADD(CURDATE(), INTERVAL 30 DAY),
//           'TRIAL', 'FREE_TRIAL', 'USER', 1)`,
//       [cleanName, cleanEmail, hashedPassword]
//     );

//     const userId = result.insertId;

//     const token = jwt.sign(
//       {
//         id: userId,
//         userId,
//         role: "USER",
//       },
//       JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     return res.status(201).json({
//       message: "Registration successful.",
//       token,
//       user: {
//         id: userId,
//         name: cleanName,
//         email: cleanEmail,
//         role: "USER",
//         subscriptionStatus: "TRIAL",
//         plan: "FREE_TRIAL",
//       },
//       trialDays: 30,
//     });
//   } catch (error) {
//     console.error("REGISTER ERROR:", error);

//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({
//         message: "An account with this email already exists.",
//       });
//     }

//     return res.status(500).json({
//       message: "Registration failed. Please try again.",
//     });
//   }
// };

// // =====================================================
// // LOGIN
// // =====================================================

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (
//       typeof email !== "string" ||
//       typeof password !== "string" ||
//       !email.trim() ||
//       !password
//     ) {
//       return res.status(400).json({
//         message: "Email and password are required.",
//       });
//     }

//     if (!JWT_SECRET) {
//       console.error("JWT_SECRET is missing.");

//       return res.status(500).json({
//         message: "Server configuration error.",
//       });
//     }

//     const cleanEmail = email.trim().toLowerCase();

//     // Get user and actual role from MySQL
//     const [users] = await db.query(
//       `SELECT
//         id,
//         business_id,
//         name,
//         email,
//         password,
//         role,
//         is_active,
//         trial_start_date,
//         trial_end_date,
//         subscription_status,
//         plan,
//         subscription_end_date
//        FROM users
//        WHERE email = ?
//        LIMIT 1`,
//       [cleanEmail]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({
//         message: "Invalid email or password.",
//       });
//     }

//     const user = users[0];

//     // Verify password
//     const passwordMatch = await bcrypt.compare(
//       password,
//       user.password
//     );

//     if (!passwordMatch) {
//       return res.status(401).json({
//         message: "Invalid email or password.",
//       });
//     }

//     // Block deactivated accounts
//     if (Number(user.is_active) !== 1) {
//       return res.status(403).json({
//         message: "Your account is deactivated.",
//       });
//     }

//     const role = String(user.role || "USER").toUpperCase();
//     const isAdmin = role === "ADMIN";

//     let currentStatus = user.subscription_status;
//     let accessAllowed = false;

//     // =================================================
//     // ADMIN: BYPASS TRIAL / SUBSCRIPTION EXPIRY
//     // =================================================

//     if (isAdmin) {
//       accessAllowed = true;
//       currentStatus = "ACTIVE";

//       // Keep Admin status ACTIVE.
//       // Admin must not be marked EXPIRED by trial checks.
//       if (user.subscription_status !== "ACTIVE") {
//         await db.query(
//           `UPDATE users
//            SET subscription_status = 'ACTIVE'
//            WHERE id = ? AND role = 'ADMIN'`,
//           [user.id]
//         );
//       }
//     } else {
//       // =================================================
//       // NORMAL USER: TRIAL / SUBSCRIPTION VALIDATION
//       // =================================================

//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       let trialEndDate = null;

//       if (user.trial_end_date) {
//         trialEndDate = new Date(user.trial_end_date);
//         trialEndDate.setHours(0, 0, 0, 0);
//       }

//       // Trial is still valid
//       if (trialEndDate && today <= trialEndDate) {
//         accessAllowed = true;
//         currentStatus = "TRIAL";

//         if (user.subscription_status !== "TRIAL") {
//           await db.query(
//             `UPDATE users
//              SET subscription_status = 'TRIAL'
//              WHERE id = ? AND role <> 'ADMIN'`,
//             [user.id]
//           );
//         }
//       } else {
//         // Trial ended: check paid/active subscription
//         let subscriptionEndDate = null;

//         if (user.subscription_end_date) {
//           subscriptionEndDate = new Date(
//             user.subscription_end_date
//           );
//           subscriptionEndDate.setHours(0, 0, 0, 0);
//         }

//         if (
//           user.subscription_status === "ACTIVE" &&
//           subscriptionEndDate &&
//           today <= subscriptionEndDate
//         ) {
//           accessAllowed = true;
//           currentStatus = "ACTIVE";
//         } else {
//           accessAllowed = false;
//           currentStatus = "EXPIRED";

//           await db.query(
//             `UPDATE users
//              SET subscription_status = 'EXPIRED'
//              WHERE id = ? AND role <> 'ADMIN'`,
//             [user.id]
//           );
//         }
//       }
//     }

//     // Block expired regular users only
//     if (!accessAllowed) {
//       return res.status(403).json({
//         message:
//           "Your free trial has expired. Please subscribe to continue.",
//         status: "TRIAL_EXPIRED",
//         subscription_status: "EXPIRED",
//       });
//     }

//     // =================================================
//     // CREATE JWT WITH DATABASE ROLE
//     // =================================================

//     const token = jwt.sign(
//       {
//         id: user.id,
//         userId: user.id,
//         businessId: user.business_id || null,
//         role,
//       },
//       JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     // =================================================
//     // LOGIN SUCCESS
//     // =================================================

//     return res.status(200).json({
//       message: "Login successful.",
//       token,
//       user: {
//         id: user.id,
//         businessId: user.business_id || null,
//         name: user.name,
//         email: user.email,
//         role,
//         trialStartDate: user.trial_start_date,
//         trialEndDate: user.trial_end_date,
//         subscriptionStatus: currentStatus,
//         plan: user.plan,
//         subscriptionEndDate: user.subscription_end_date,
//         business: null,
//       },
//     });
//   } catch (error) {
//     console.error("LOGIN ERROR:", error);

//     return res.status(500).json({
//       message: "Login failed. Please try again.",
//     });
//   }
// };

// // =====================================================
// // EXPORT
// // =====================================================

// module.exports = {
//   register,
//   login,
// };


// // 1. Get registered user's security question
// exports.getSecurityQuestion = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     const [users] = await db.promise().query(
//       "SELECT id, reset_question FROM users WHERE email = ?",
//       [email]
//     );

//     if (!users.length || !users[0].reset_question) {
//       return res.status(404).json({
//         message: "Account or security question not found",
//       });
//     }

//     res.json({
//       success: true,
//       question: users[0].reset_question,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // 2. Verify answer and reset password
// exports.resetPassword = async (req, res) => {
//   try {
//     const { email, answer, newPassword, confirmPassword } = req.body;

//     if (!email || !answer || !newPassword || !confirmPassword) {
//       return res.status(400).json({
//         message: "All fields are required",
//       });
//     }

//     if (newPassword !== confirmPassword) {
//       return res.status(400).json({
//         message: "Passwords do not match",
//       });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({
//         message: "Password must contain at least 8 characters",
//       });
//     }

//     const [users] = await db.promise().query(
//       "SELECT id, reset_answer FROM users WHERE email = ?",
//       [email]
//     );

//     if (!users.length || !users[0].reset_answer) {
//       return res.status(400).json({
//         message: "Invalid account or security answer",
//       });
//     }

//     const validAnswer = await bcrypt.compare(
//       answer.trim().toLowerCase(),
//       users[0].reset_answer
//     );

//     if (!validAnswer) {
//       return res.status(400).json({
//         message: "Incorrect security answer",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     await db.promise().query(
//       "UPDATE users SET password = ? WHERE id = ?",
//       [hashedPassword, users[0].id]
//     );

//     res.json({
//       success: true,
//       message: "Password reset successfully",
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../config/db");
const { JWT_SECRET } = require("../config/env");

// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      resetQuestion,
      resetAnswer,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !resetQuestion ||
      !resetAnswer
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof resetQuestion !== "string" ||
      typeof resetAnswer !== "string" ||
      password.length < 6 ||
      !resetQuestion.trim() ||
      !resetAnswer.trim()
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
    const cleanAnswer = resetAnswer.trim().toLowerCase();

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

    // Hash security answer
    const hashedAnswer = await bcrypt.hash(cleanAnswer, 10);

    const [result] = await db.query(
      `INSERT INTO users
      (
        name,
        email,
        password,
        reset_question,
        reset_answer,
        trial_start_date,
        trial_end_date,
        subscription_status,
        plan,
        role,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, CURDATE(),
        DATE_ADD(CURDATE(), INTERVAL 30 DAY),
        'TRIAL', 'FREE_TRIAL', 'USER', 1)`,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        resetQuestion.trim(),
        hashedAnswer,
      ]
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

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        message: "Your account is deactivated.",
      });
    }

    const role = String(user.role || "USER").toUpperCase();
    const isAdmin = role === "ADMIN";

    let currentStatus = user.subscription_status;
    let accessAllowed = false;

    // ADMIN: BYPASS TRIAL / SUBSCRIPTION EXPIRY

    if (isAdmin) {
      accessAllowed = true;
      currentStatus = "ACTIVE";

      if (user.subscription_status !== "ACTIVE") {
        await db.query(
          `UPDATE users
           SET subscription_status = 'ACTIVE'
           WHERE id = ? AND role = 'ADMIN'`,
          [user.id]
        );
      }
    } else {
      // NORMAL USER: TRIAL / SUBSCRIPTION VALIDATION

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let trialEndDate = null;

      if (user.trial_end_date) {
        trialEndDate = new Date(user.trial_end_date);
        trialEndDate.setHours(0, 0, 0, 0);
      }

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

    if (!accessAllowed) {
      return res.status(403).json({
        message:
          "Your free trial has expired. Please subscribe to continue.",
        status: "TRIAL_EXPIRED",
        subscription_status: "EXPIRED",
      });
    }

    // CREATE JWT WITH DATABASE ROLE

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
// FORGOT PASSWORD - GET SECURITY QUESTION
// =====================================================

const getSecurityQuestion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.query(
      `SELECT reset_question
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (!users.length || !users[0].reset_question) {
      return res.status(404).json({
        message: "Account or security question not found.",
      });
    }

    return res.status(200).json({
      success: true,
      question: users[0].reset_question,
    });
  } catch (error) {
    console.error("SECURITY QUESTION ERROR:", error);

    return res.status(500).json({
      message: "Unable to get security question.",
    });
  }
};

// =====================================================
// RESET PASSWORD
// =====================================================

const resetPassword = async (req, res) => {
  try {
    const {
      email,
      answer,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !email ||
      !answer ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (
      typeof email !== "string" ||
      typeof answer !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid input.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanAnswer = answer.trim().toLowerCase();

    const [users] = await db.query(
      `SELECT id, reset_answer
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (!users.length || !users[0].reset_answer) {
      return res.status(400).json({
        message: "Invalid account or security answer.",
      });
    }

    const validAnswer = await bcrypt.compare(
      cleanAnswer,
      users[0].reset_answer
    );

    if (!validAnswer) {
      return res.status(400).json({
        message: "Incorrect security answer.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, users[0].id]
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Password reset failed.",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  register,
  login,
  getSecurityQuestion,
  resetPassword,
};
