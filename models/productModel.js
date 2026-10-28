const db = require("../config/db");

const getProductsByBusiness = async (businessId) => {
  const [rows] = await db.promise().query(
    `
    SELECT
      id,
      business_id,
      product_name,
      sku,
      barcode,
      hsn_sac,
      category,
      purchase_price,
      selling_price,
      gst_percent,
      discount,
      stock_quantity,
      unit,
      created_at,
      updated_at
    FROM products
    WHERE business_id = ?
    ORDER BY id DESC
    `,
    [businessId]
  );

  return rows;
};

const getProductById = async (productId, businessId) => {
  const [rows] = await db.promise().query(
    `
    SELECT
      id,
      business_id,
      product_name,
      sku,
      barcode,
      hsn_sac,
      category,
      purchase_price,
      selling_price,
      gst_percent,
      discount,
      stock_quantity,
      unit,
      created_at,
      updated_at
    FROM products
    WHERE id = ?
      AND business_id = ?
    `,
    [productId, businessId]
  );

  return rows.length > 0 ? rows[0] : null;
};

const createProduct = async (productData) => {
  const {
    business_id,
    product_name,
    sku,
    barcode,
    hsn_sac,
    category,
    purchase_price,
    selling_price,
    gst_percent,
    discount,
    stock_quantity,
    unit,
  } = productData;

  const [result] = await db.promise().query(
    `
    INSERT INTO products
    (
      business_id,
      product_name,
      sku,
      barcode,
      hsn_sac,
      category,
      purchase_price,
      selling_price,
      gst_percent,
      discount,
      stock_quantity,
      unit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      business_id,
      product_name,
      sku || null,
      barcode || null,
      hsn_sac || null,
      category || null,
      purchase_price,
      selling_price,
      gst_percent,
      discount,
      stock_quantity,
      unit,
    ]
  );

  return result.insertId;
};

const updateProduct = async (
  productId,
  businessId,
  productData
) => {
  const {
    product_name,
    sku,
    barcode,
    hsn_sac,
    category,
    purchase_price,
    selling_price,
    gst_percent,
    discount,
    stock_quantity,
    unit,
  } = productData;

  await db.promise().query(
    `
    UPDATE products
    SET
      product_name = ?,
      sku = ?,
      barcode = ?,
      hsn_sac = ?,
      category = ?,
      purchase_price = ?,
      selling_price = ?,
      gst_percent = ?,
      discount = ?,
      stock_quantity = ?,
      unit = ?
    WHERE id = ?
      AND business_id = ?
    `,
    [
      product_name,
      sku || null,
      barcode || null,
      hsn_sac || null,
      category || null,
      purchase_price,
      selling_price,
      gst_percent,
      discount,
      stock_quantity,
      unit,
      productId,
      businessId,
    ]
  );

  return getProductById(productId, businessId);
};

const deleteProduct = async (productId, businessId) => {
  const [result] = await db.promise().query(
    `
    DELETE FROM products
    WHERE id = ?
      AND business_id = ?
    `,
    [productId, businessId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  getProductsByBusiness,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};