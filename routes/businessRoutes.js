// const express = require("express");

// const router = express.Router();

// const {
//   getBusiness,
//   saveBusiness,
// } = require("../controllers/businessController");

// const authMiddleware = require("../middleware/authMiddleware");

// /*
//   Get business details
// */
// router.get("/", authMiddleware, getBusiness);

// /*
//   Create / Update business
// */
// router.put("/", authMiddleware, saveBusiness);

// module.exports = router;
// const express = require("express");
// const multer = require("multer");
// const path = require("path");

// const db = require("../db");
// const authMiddleware = require("../middleware/authMiddleware");

// const router = express.Router();

// /* =========================
//    LOGO UPLOAD
// ========================= */

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/businesses/");
//   },

//   filename: (req, file, cb) => {
//     const extension = path.extname(file.originalname);

//     cb(
//       null,
//       `business-${req.user.id}-${Date.now()}${extension}`
//     );
//   },
// });

// const upload = multer({
//   storage,

//   limits: {
//     fileSize: 2 * 1024 * 1024,
//   },

//   fileFilter: (req, file, cb) => {
//     const allowedTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/webp",
//     ];

//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(
//         new Error(
//           "Only JPG, PNG and WEBP images are allowed"
//         )
//       );
//     }
//   },
// });

// /* =========================
//    CREATE / UPDATE BUSINESS
// ========================= */

// router.post(
//   "/",
//   authMiddleware,
//   upload.single("logo"),
//   async (req, res) => {
//     try {
//       const userId = req.user.id;

//       const {
//         businessName,
//         ownerName,
//         mobile,
//         email,
//         address,
//         gstNumber,
//         panNumber,
//         businessType,
//         state,
//         invoicePrefix,
//       } = req.body;

//       if (!businessName?.trim()) {
//         return res.status(400).json({
//           message: "Business name is required",
//         });
//       }

//       if (!ownerName?.trim()) {
//         return res.status(400).json({
//           message: "Owner name is required",
//         });
//       }

//       if (!mobile?.trim()) {
//         return res.status(400).json({
//           message: "Mobile number is required",
//         });
//       }

//       if (!businessType) {
//         return res.status(400).json({
//           message: "Business type is required",
//         });
//       }

//       if (!state) {
//         return res.status(400).json({
//           message: "State is required",
//         });
//       }

//       const logo = req.file
//         ? `/uploads/businesses/${req.file.filename}`
//         : null;

//       const [existing] = await db.query(
//         "SELECT id, logo FROM businesses WHERE user_id = ?",
//         [userId]
//       );

//       if (existing.length > 0) {
//         const businessId = existing[0].id;

//         await db.query(
//           `UPDATE businesses
//            SET
//              business_name = ?,
//              owner_name = ?,
//              mobile = ?,
//              email = ?,
//              address = ?,
//              gst_number = ?,
//              pan_number = ?,
//              business_type = ?,
//              state = ?,
//              logo = COALESCE(?, logo),
//              invoice_prefix = ?
//            WHERE user_id = ?`,
//           [
//             businessName.trim(),
//             ownerName.trim(),
//             mobile.trim(),
//             email?.trim() || null,
//             address?.trim() || null,
//             gstNumber?.trim() || null,
//             panNumber?.trim() || null,
//             businessType,
//             state,
//             logo,
//             invoicePrefix?.trim() || "INV",
//             userId,
//           ]
//         );

//         return res.json({
//           message: "Business details updated successfully",
//           businessId,
//         });
//       }

//       const [result] = await db.query(
//         `INSERT INTO businesses
//         (
//           user_id,
//           business_name,
//           owner_name,
//           mobile,
//           email,
//           address,
//           gst_number,
//           pan_number,
//           business_type,
//           state,
//           logo,
//           invoice_prefix
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           userId,
//           businessName.trim(),
//           ownerName.trim(),
//           mobile.trim(),
//           email?.trim() || null,
//           address?.trim() || null,
//           gstNumber?.trim() || null,
//           panNumber?.trim() || null,
//           businessType,
//           state,
//           logo,
//           invoicePrefix?.trim() || "INV",
//         ]
//       );

//       return res.status(201).json({
//         message: "Business details saved successfully",
//         businessId: result.insertId,
//       });
//     } catch (error) {
//       console.error("Business save error:", error);

//       return res.status(500).json({
//         message: "Failed to save business details",
//       });
//     }
//   }
// );

// /* =========================
//    GET BUSINESS DETAILS
// ========================= */

// router.get(
//   "/me",
//   authMiddleware,
//   async (req, res) => {
//     try {
//       const [rows] = await db.query(
//         `SELECT
//           id,
//           business_name AS businessName,
//           owner_name AS ownerName,
//           mobile,
//           email,
//           address,
//           gst_number AS gstNumber,
//           pan_number AS panNumber,
//           business_type AS businessType,
//           state,
//           logo,
//           invoice_prefix AS invoicePrefix
//          FROM businesses
//          WHERE user_id = ?`,
//         [req.user.id]
//       );

//       if (rows.length === 0) {
//         return res.status(404).json({
//           message: "Business details not found",
//         });
//       }

//       res.json(rows[0]);
//     } catch (error) {
//       console.error("Get business error:", error);

//       res.status(500).json({
//         message: "Failed to get business details",
//       });
//     }
//   }
// );

// module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   UPLOAD FOLDER
========================= */

const uploadDir = path.join(
  __dirname,
  "../uploads/businesses"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* =========================
   LOGO UPLOAD
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(
      null,
      `business-${req.user.id}-${Date.now()}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, PNG and WEBP images are allowed"
        )
      );
    }
  },
});

/* =========================
   CREATE / UPDATE BUSINESS
   POST /api/business
========================= */

router.post(
  "/",
  authMiddleware,
  upload.single("logo"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const {
        businessName,
        ownerName,
        mobile,
        email,
        address,
        gstNumber,
        panNumber,
        businessType,
        state,
        invoicePrefix,
      } = req.body;

      /* =========================
         VALIDATION
      ========================= */

      if (!businessName?.trim()) {
        return res.status(400).json({
          message: "Business name is required",
        });
      }

      if (!ownerName?.trim()) {
        return res.status(400).json({
          message: "Owner name is required",
        });
      }

      if (!mobile?.trim()) {
        return res.status(400).json({
          message: "Mobile number is required",
        });
      }

      if (!businessType) {
        return res.status(400).json({
          message: "Business type is required",
        });
      }

      if (!state) {
        return res.status(400).json({
          message: "State is required",
        });
      }

      /* =========================
         LOGO
      ========================= */

      const logo = req.file
        ? `/uploads/businesses/${req.file.filename}`
        : null;

      /* =========================
         CHECK EXISTING BUSINESS
      ========================= */

      const [existing] = await db.query(
        `SELECT id, logo
         FROM businesses
         WHERE user_id = ?`,
        [userId]
      );

      /* =========================
         UPDATE BUSINESS
      ========================= */

      if (existing.length > 0) {
        const businessId = existing[0].id;

        await db.query(
          `UPDATE businesses
           SET
             business_name = ?,
             owner_name = ?,
             mobile = ?,
             email = ?,
             address = ?,
             gst_number = ?,
             pan_number = ?,
             business_type = ?,
             state = ?,
             logo = COALESCE(?, logo),
             invoice_prefix = ?
           WHERE user_id = ?`,
          [
            businessName.trim(),
            ownerName.trim(),
            mobile.trim(),
            email?.trim() || null,
            address?.trim() || null,
            gstNumber?.trim() || null,
            panNumber?.trim() || null,
            businessType,
            state,
            logo,
            invoicePrefix?.trim() || "INV",
            userId,
          ]
        );

        return res.json({
          message:
            "Business details updated successfully",
          businessId,
        });
      }

      /* =========================
         INSERT BUSINESS
      ========================= */

      const [result] = await db.query(
        `INSERT INTO businesses (
          user_id,
          business_name,
          owner_name,
          mobile,
          email,
          address,
          gst_number,
          pan_number,
          business_type,
          state,
          logo,
          invoice_prefix
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          businessName.trim(),
          ownerName.trim(),
          mobile.trim(),
          email?.trim() || null,
          address?.trim() || null,
          gstNumber?.trim() || null,
          panNumber?.trim() || null,
          businessType,
          state,
          logo,
          invoicePrefix?.trim() || "INV",
        ]
      );

      return res.status(201).json({
        message:
          "Business details saved successfully",
        businessId: result.insertId,
      });
    } catch (error) {
      console.error(
        "Business save error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to save business details",
      });
    }
  }
);

/* =========================
   GET BUSINESS DETAILS
   GET /api/business/me
========================= */

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [rows] = await db.query(
        `SELECT
          id,
          business_name AS businessName,
          owner_name AS ownerName,
          mobile,
          email,
          address,
          gst_number AS gstNumber,
          pan_number AS panNumber,
          business_type AS businessType,
          state,
          logo,
          invoice_prefix AS invoicePrefix
         FROM businesses
         WHERE user_id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message:
            "Business details not found",
        });
      }

      return res.json(rows[0]);
    } catch (error) {
      console.error(
        "Get business error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get business details",
      });
    }
  }
);

module.exports = router;