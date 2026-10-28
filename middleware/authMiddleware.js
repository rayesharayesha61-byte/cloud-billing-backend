// const jwt = require("jsonwebtoken");

// const { JWT_SECRET } = require("../config/env");

// const authMiddleware = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "Authorization token is required.",
//       });
//     }

//     const token = authHeader.startsWith("Bearer ")
//       ? authHeader.split(" ")[1]
//       : authHeader;

//     if (!token) {
//       return res.status(401).json({
//         message: "Invalid authorization token.",
//       });
//     }

//     const decoded = jwt.verify(
//       token,
//       JWT_SECRET
//     );

//     req.user = decoded;

//     next();
//   } catch (error) {
//     console.error("Auth Error:", error);

//     return res.status(401).json({
//       message: "Invalid or expired token.",
//     });
//   }
// };



// const authMiddleware = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "Authentication required",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({
//         message: "Invalid authentication token",
//       });
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET
//     );

//     req.user = decoded;

//     next();
//   } catch (error) {
//     return res.status(401).json({
//       message: "Invalid or expired token",
//     });
//   }
// };


// module.exports = authMiddleware;
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization header check
    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token is required.",
      });
    }

    // Bearer token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({
        message: "Invalid authorization token.",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Store decoded user information
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Auth Error:", error);

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;