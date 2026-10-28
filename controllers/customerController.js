const db = require("../config/db");

// =====================================
// GET CUSTOMERS
// =====================================

const getCustomers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find business of logged-in user
    const [businessRows] = await db.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [customers] = await db.query(
      `
      SELECT
        id,
        customer_name,
        mobile,
        email,
        address,
        gstin,
        state,
        customer_type,
        opening_outstanding,
        created_at
      FROM customers
      WHERE business_id = ?
      ORDER BY id DESC
      `,
      [businessId]
    );

    res.json(customers);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(500).json({
      message: "Unable to load customers.",
      error: error.message,
    });
  }
};

// =====================================
// ADD CUSTOMER
// =====================================

const createCustomer = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      customerName,
      mobile,
      email,
      address,
      gstin,
      state,
      customerType,
      openingOutstanding,
    } = req.body;

    // Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        message: "Customer name is required.",
      });
    }

    // Find logged-in user's business
    const [businessRows] = await db.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    // Insert customer
    const [result] = await db.query(
      `
      INSERT INTO customers
      (
        business_id,
        customer_name,
        mobile,
        email,
        address,
        gstin,
        state,
        customer_type,
        opening_outstanding
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        businessId,
        customerName.trim(),
        mobile || null,
        email || null,
        address || null,
        gstin || null,
        state || null,
        customerType || "Individual",
        Number(openingOutstanding) || 0,
      ]
    );

    res.status(201).json({
      message: "Customer added successfully.",
      customerId: result.insertId,
    });
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);

    res.status(500).json({
      message: "Unable to add customer.",
      error: error.message,
    });
  }
};

// =====================================
// UPDATE CUSTOMER
// =====================================

const updateCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    const {
      customerName,
      mobile,
      email,
      address,
      gstin,
      state,
      customerType,
      openingOutstanding,
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        message: "Customer name is required.",
      });
    }

    const [businessRows] = await db.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [result] = await db.query(
      `
      UPDATE customers
      SET
        customer_name = ?,
        mobile = ?,
        email = ?,
        address = ?,
        gstin = ?,
        state = ?,
        customer_type = ?,
        opening_outstanding = ?
      WHERE id = ?
      AND business_id = ?
      `,
      [
        customerName.trim(),
        mobile || null,
        email || null,
        address || null,
        gstin || null,
        state || null,
        customerType || "Individual",
        Number(openingOutstanding) || 0,
        customerId,
        businessId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    res.json({
      message: "Customer updated successfully.",
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);

    res.status(500).json({
      message: "Unable to update customer.",
      error: error.message,
    });
  }
};

// =====================================
// DELETE CUSTOMER
// =====================================

const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    const [businessRows] = await db.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({
        message: "Business details not found.",
      });
    }

    const businessId = businessRows[0].id;

    const [result] = await db.query(
      `
      DELETE FROM customers
      WHERE id = ?
      AND business_id = ?
      `,
      [customerId, businessId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    res.json({
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    res.status(500).json({
      message: "Unable to delete customer.",
      error: error.message,
    });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};