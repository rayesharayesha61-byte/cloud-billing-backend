
const db = require("../config/db");

// ========================================
// GET ALL PRODUCTS
// ========================================
const getProducts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [businessRows] = await db.query(
      `SELECT id FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [products] = await db.query(
      `SELECT *
       FROM products
       WHERE business_id = ?
       ORDER BY id DESC`,
      [businessId]
    );

    return res.status(200).json(products);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      message: "Unable to load products.",
    });
  }
};

// ========================================
// CREATE PRODUCT
// ========================================
const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      product_name,
      sku,
      barcode,
      hsn_sac,
      category,
      purchase_price = 0,
      selling_price,
      gst = 0,
      discount = 0,
      stock_quantity = 0,
      unit = "PCS",
    } = req.body;

    if (!product_name || !product_name.trim()) {
      return res.status(400).json({
        message: "Product name is required.",
      });
    }

    if (
      selling_price === undefined ||
      selling_price === null ||
      selling_price === ""
    ) {
      return res.status(400).json({
        message: "Selling price is required.",
      });
    }

    const purchasePrice = Number(purchase_price);
    const sellingPrice = Number(selling_price);
    const gstValue = Number(gst);
    const discountValue = Number(discount);
    const stockValue = Number(stock_quantity);

    if (
      ![purchasePrice, sellingPrice, gstValue,
        discountValue, stockValue].every(Number.isFinite) ||
      purchasePrice < 0 ||
      sellingPrice < 0 ||
      gstValue < 0 ||
      gstValue > 100 ||
      discountValue < 0 ||
      discountValue > 100 ||
      stockValue < 0
    ) {
      return res.status(400).json({
        message: "Please enter valid product values.",
      });
    }

    const [businessRows] = await db.query(
      `SELECT id FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [result] = await db.query(
      `INSERT INTO products (
        business_id,
        product_name,
        sku,
        barcode,
        hsn_sac,
        category,
        purchase_price,
        selling_price,
        gst,
        discount,
        stock_quantity,
        unit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        businessId,
        product_name.trim(),
        sku || null,
        barcode || null,
        hsn_sac || null,
        category || null,
        purchasePrice,
        sellingPrice,
        gstValue,
        discountValue,
        stockValue,
        unit || "PCS",
      ]
    );

    const [rows] = await db.query(
      `SELECT * FROM products
       WHERE id = ? AND business_id = ?`,
      [result.insertId, businessId]
    );

    return res.status(201).json({
      message: "Product created successfully.",
      product: rows[0],
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Unable to create product.",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE PRODUCT
// ========================================
const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.id);

    const {
      product_name,
      sku,
      barcode,
      hsn_sac,
      category,
      purchase_price,
      selling_price,
      gst,
      discount,
      stock_quantity,
      unit,
    } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const [businessRows] = await db.query(
      `SELECT id FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [existingRows] = await db.query(
      `SELECT * FROM products
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [productId, businessId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const current = existingRows[0];

    const name =
      product_name === undefined
        ? current.product_name
        : product_name;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Product name is required.",
      });
    }

    const values = {
      purchase_price:
        purchase_price === undefined
          ? Number(current.purchase_price)
          : Number(purchase_price),
      selling_price:
        selling_price === undefined
          ? Number(current.selling_price)
          : Number(selling_price),
      gst:
        gst === undefined ? Number(current.gst) : Number(gst),
      discount:
        discount === undefined
          ? Number(current.discount)
          : Number(discount),
      stock_quantity:
        stock_quantity === undefined
          ? Number(current.stock_quantity)
          : Number(stock_quantity),
    };

    if (
      !Object.values(values).every(Number.isFinite) ||
      values.purchase_price < 0 ||
      values.selling_price < 0 ||
      values.gst < 0 ||
      values.gst > 100 ||
      values.discount < 0 ||
      values.discount > 100 ||
      values.stock_quantity < 0
    ) {
      return res.status(400).json({
        message: "Please enter valid product values.",
      });
    }

    await db.query(
      `UPDATE products SET
        product_name = ?,
        sku = ?,
        barcode = ?,
        hsn_sac = ?,
        category = ?,
        purchase_price = ?,
        selling_price = ?,
        gst = ?,
        discount = ?,
        stock_quantity = ?,
        unit = ?
       WHERE id = ? AND business_id = ?`,
      [
        name.trim(),
        sku === undefined ? current.sku : sku || null,
        barcode === undefined ? current.barcode : barcode || null,
        hsn_sac === undefined ? current.hsn_sac : hsn_sac || null,
        category === undefined ? current.category : category || null,
        values.purchase_price,
        values.selling_price,
        values.gst,
        values.discount,
        values.stock_quantity,
        unit === undefined ? current.unit : unit || "PCS",
        productId,
        businessId,
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT * FROM products
       WHERE id = ? AND business_id = ?`,
      [productId, businessId]
    );

    return res.status(200).json({
      message: "Product updated successfully.",
      product: updatedRows[0],
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Unable to update product.",
      error: error.message,
    });
  }
};

// ========================================
// DELETE PRODUCT
// ========================================
const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const [businessRows] = await db.query(
      `SELECT id FROM businesses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [result] = await db.query(
      `DELETE FROM products
       WHERE id = ? AND business_id = ?`,
      [productId, businessId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "This product is used in existing records and cannot be deleted.",
      });
    }

    return res.status(500).json({
      message: "Unable to delete product.",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

