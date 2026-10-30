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

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId =
      decoded.id || decoded.userId || decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const [users] = await db.query(
      "SELECT id, role, is_active FROM users WHERE id = ?",
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (users[0].role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Super Admin access only",
      });
    }

    if (!users[0].is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    req.admin = users[0];

    next();
  } catch (error) {
    console.error("Super Admin Auth Error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = superAdminAuth;