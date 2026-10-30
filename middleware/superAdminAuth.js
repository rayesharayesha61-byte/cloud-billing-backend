
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in Render environment");
      return res.status(500).json({
        success: false,
        message: "Server JWT configuration missing",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
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

    const userId =
      decoded.id || decoded.userId || decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing in token",
      });
    }

    let users;

    try {
      [users] = await db.query(
        "SELECT id, role, is_active FROM users WHERE id = ?",
        [userId]
      );
    } catch (dbError) {
      console.error("Super Admin DB Error:", dbError.message);

      return res.status(500).json({
        success: false,
        message: "Database authentication query failed",
      });
    }

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    if (String(user.role).toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Super Admin access only",
      });
    }

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    req.admin = user;
    next();

  } catch (error) {
    console.error("Super Admin Middleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
    });
  }
};

module.exports = superAdminAuth;
