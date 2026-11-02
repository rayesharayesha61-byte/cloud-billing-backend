
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { JWT_SECRET } = require("../config/env");

const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET missing in config/env");
      return res.status(500).json({
        success: false,
        message: "JWT configuration error",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error("JWT VERIFY ERROR:", error.message);

      return res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Token expired. Please login again."
            : "Invalid token. Please login again.",
      });
    }

    const adminId = decoded.id || decoded.userId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Admin ID missing in token",
      });
    }

    const [users] = await db.query(
      `SELECT id, name, email, role, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );

    if (!users.length) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
      });
    }

    const admin = users[0];
    const role = String(admin.role || "").toUpperCase();

    // Your login code uses ADMIN role
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    if (Number(admin.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    req.admin = admin;

    next();

  } catch (error) {
    console.error("SUPER ADMIN AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication server error",
    });
  }
};

module.exports = superAdminAuth;
