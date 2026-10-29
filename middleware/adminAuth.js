
const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId || decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const [rows] = await db.query(
      "SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = rows[0];
    const role = String(user.role || "").toUpperCase();

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated",
      });
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    req.admin = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    console.error("Admin authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

module.exports = adminAuth;
