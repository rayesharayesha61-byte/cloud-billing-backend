// backend/controllers/reportController.js

const db = require("../config/db");

// Get the logged-in user's business ID
async function getBusinessId(userId) {
  const [rows] = await db.query(
    "SELECT id FROM businesses WHERE user_id = ? LIMIT 1",
    [userId]
  );

  return rows.length ? rows[0].id : null;
}

// Validate date filters
function getDateFilters(req) {
  const { startDate, endDate } = req.query;

  const validDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

  if (startDate && !validDate(startDate)) {
    throw new Error("Invalid startDate. Use YYYY-MM-DD.");
  }

  if (endDate && !validDate(endDate)) {
    throw new Error("Invalid endDate. Use YYYY-MM-DD.");
  }

  if (startDate && endDate && startDate > endDate) {
    throw new Error("startDate cannot be after endDate.");
  }

  return {
    startDate: startDate || "2000-01-01",
    endDate: endDate || "2099-12-31",
  };
}

function handleError(res, error) {
  console.error("REPORT ERROR:", error);
  return res.status(error.message.startsWith("Invalid") ||
    error.message.startsWith("startDate") ? 400 : 500).json({
    message: error.message || "Unable to load report.",
  });
}

// GET /api/reports/summary
exports.getSummary = async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user.id);

    if (!businessId) {
      return res.status(404).json({ message: "Business not found." });
    }

    const { startDate, endDate } = getDateFilters(req);

    const [rows] = await db.query(
      `SELECT
         COUNT(*) AS invoiceCount,
         COALESCE(SUM(subtotal), 0) AS subtotal,
         COALESCE(SUM(discount_amount), 0) AS discountAmount,
         COALESCE(SUM(gst_amount), 0) AS gstAmount,
         COALESCE(SUM(grand_total), 0) AS totalSales,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID'
           THEN grand_total ELSE 0 END), 0) AS paidInvoiceTotal,
         COALESCE(SUM(CASE WHEN payment_status = 'UNPAID'
           THEN grand_total ELSE 0 END), 0) AS unpaidInvoiceTotal,
         COALESCE(SUM(CASE WHEN payment_status = 'PARTIAL'
           THEN grand_total ELSE 0 END), 0) AS partialInvoiceTotal
       FROM invoices
       WHERE business_id = ?
         AND invoice_date BETWEEN ? AND ?`,
      [businessId, startDate, endDate]
    );

    const [paymentRows] = await db.query(
      `SELECT COALESCE(SUM(pr.amount), 0) AS receivedAmount
       FROM payments_received pr
       INNER JOIN invoices i ON i.id = pr.invoice_id
       WHERE pr.business_id = ?
         AND i.business_id = ?
         AND i.invoice_date BETWEEN ? AND ?`,
      [businessId, businessId, startDate, endDate]
    );

    const totalSales = Number(rows[0].totalSales || 0);
    const receivedAmount =
      Number(paymentRows[0].receivedAmount || 0);

    res.json({
      ...rows[0],
      totalSales,
      receivedAmount,
      pendingAmount: Math.max(0, totalSales - receivedAmount),
      startDate,
      endDate,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/reports/sales
exports.getSalesReport = async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user.id);

    if (!businessId) {
      return res.status(404).json({ message: "Business not found." });
    }

    const { startDate, endDate } = getDateFilters(req);

    const [rows] = await db.query(
      `SELECT
         i.id,
         i.invoice_number AS invoiceNumber,
         i.invoice_date AS invoiceDate,
         c.customer_name AS customerName,
         i.subtotal,
         i.discount_amount AS discountAmount,
         i.gst_amount AS gstAmount,
         i.grand_total AS grandTotal,
         i.payment_mode AS paymentMode,
         i.payment_status AS paymentStatus,
         COALESCE(p.receivedAmount, 0) AS receivedAmount,
         GREATEST(i.grand_total - COALESCE(p.receivedAmount, 0), 0)
           AS pendingAmount
       FROM invoices i
       LEFT JOIN customers c
         ON c.id = i.customer_id AND c.business_id = i.business_id
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS receivedAmount
         FROM payments_received
         WHERE business_id = ?
         GROUP BY invoice_id
       ) p ON p.invoice_id = i.id
       WHERE i.business_id = ?
         AND i.invoice_date BETWEEN ? AND ?
       ORDER BY i.invoice_date DESC, i.id DESC`,
      [businessId, businessId, startDate, endDate]
    );

    res.json({ data: rows, startDate, endDate });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/reports/gst
exports.getGstReport = async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user.id);

    if (!businessId) {
      return res.status(404).json({ message: "Business not found." });
    }

    const { startDate, endDate } = getDateFilters(req);

    const [rows] = await db.query(
      `SELECT
         i.invoice_number AS invoiceNumber,
         i.invoice_date AS invoiceDate,
         c.customer_name AS customerName,
         i.subtotal,
         i.discount_amount AS discountAmount,
         i.gst_amount AS gstAmount,
         i.grand_total AS grandTotal
       FROM invoices i
       LEFT JOIN customers c
         ON c.id = i.customer_id AND c.business_id = i.business_id
       WHERE i.business_id = ?
         AND i.invoice_date BETWEEN ? AND ?
       ORDER BY i.invoice_date DESC`,
      [businessId, startDate, endDate]
    );

    const totalGst = rows.reduce(
      (sum, row) => sum + Number(row.gstAmount || 0),
      0
    );

    res.json({ data: rows, totalGst, startDate, endDate });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/reports/customers
exports.getCustomerReport = async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user.id);

    if (!businessId) {
      return res.status(404).json({ message: "Business not found." });
    }

    const { startDate, endDate } = getDateFilters(req);

    const [rows] = await db.query(
      `SELECT
         c.id AS customerId,
         c.customer_name AS customerName,
         c.mobile,
         COUNT(i.id) AS invoiceCount,
         COALESCE(SUM(i.grand_total), 0) AS totalSales,
         COALESCE(SUM(i.gst_amount), 0) AS gstAmount
       FROM customers c
       LEFT JOIN invoices i
         ON i.customer_id = c.id
         AND i.business_id = c.business_id
         AND i.invoice_date BETWEEN ? AND ?
       WHERE c.business_id = ?
       GROUP BY c.id, c.customer_name, c.mobile
       ORDER BY totalSales DESC`,
      [startDate, endDate, businessId]
    );

    res.json({ data: rows, startDate, endDate });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /api/reports/products
exports.getProductReport = async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user.id);

    if (!businessId) {
      return res.status(404).json({ message: "Business not found." });
    }

    const { startDate, endDate } = getDateFilters(req);

    const [rows] = await db.query(
      `SELECT
         p.id AS productId,
         p.product_name AS productName,
         p.sku,
         p.stock_quantity AS stockQuantity,
         p.purchase_price AS purchasePrice,
         p.selling_price AS sellingPrice,
         COALESCE(SUM(ii.quantity), 0) AS soldQuantity,
         COALESCE(SUM(ii.line_total), 0) AS totalSales
       FROM products p
       LEFT JOIN invoice_items ii
         ON ii.product_id = p.id
         AND EXISTS (
           SELECT 1 FROM invoices i
           WHERE i.id = ii.invoice_id
             AND i.business_id = p.business_id
             AND i.invoice_date BETWEEN ? AND ?
         )
       WHERE p.business_id = ?
       GROUP BY p.id, p.product_name, p.sku, p.stock_quantity,
                p.purchase_price, p.selling_price
       ORDER BY totalSales DESC`,
      [startDate, endDate, businessId]
    );

    res.json({ data: rows, startDate, endDate });
  } catch (error) {
    return handleError(res, error);
  }
};