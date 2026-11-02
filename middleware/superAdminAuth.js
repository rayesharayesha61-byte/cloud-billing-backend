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
    const adminId = decoded.id || decoded.userId || decoded.user_id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const [rows] = await db.execute(
      `SELECT id, name, email, role, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    const admin = rows[0];

    if (
      String(admin.role).toUpperCase() !== "SUPER_ADMIN" ||
      ![1, true, "1"].includes(admin.is_active)
    ) {
      return res.status(403).json({
        success: false,
        message: "Super admin access denied",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Super admin authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = superAdminAuth;