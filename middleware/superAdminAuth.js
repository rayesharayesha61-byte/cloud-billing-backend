
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const superAdminAuth = async (req, res, next) => {
  try {
    // 1. Check Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    // 2. Check JWT Secret
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Server JWT configuration missing",
      });
    }

    // 3. Get Token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    // 4. Verify Token
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT Verification Error:", jwtError.name);

      return res.status(401).json({
        success: false,
        message:
          jwtError.name === "TokenExpiredError"
            ? "Token expired. Please login again."
            : "Invalid authentication token",
      });
    }

    // 5. Get User ID
    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing in token",
      });
    }

    // 6. Check User in Database
    const [users] = await db.query(
      `SELECT id, role, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // 7. Check Super Admin Role
    if (
      String(user.role || "").trim().toUpperCase() !==
      "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Super Admin access only",
      });
    }

    // 8. Check Active Status
    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // 9. Allow Access
    req.admin = user;

    return next();

  } catch (error) {
    console.error(
      "Super Admin Middleware Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
    });
  }
};

module.exports = superAdminAuth;
