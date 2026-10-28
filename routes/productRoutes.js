// const express = require("express");
// const router = express.Router();

// const {
//   getProducts,
//   createProduct,
//   updateProduct,
//   deleteProduct,
// } = require("../controllers/productController");

// const authMiddleware = require("../middleware/authMiddleware");

// router.get("/", authMiddleware, getProducts);
// router.post("/", authMiddleware, createProduct);
// router.put("/:id", authMiddleware, updateProduct);
// router.delete("/:id", authMiddleware, deleteProduct);

// module.exports = router;
const express = require("express");
const router = express.Router();

const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getProducts);
router.post("/", authMiddleware, createProduct);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

module.exports = router;