const db = require("../config/db");

// GET /api/expenses
exports.getExpenses = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
    );

    res.status(200).json({ expenses: rows });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      description,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Expense name is required" });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ message: "Enter a valid expense amount" });
    }

    if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      return res.status(400).json({ message: "Valid expense date is required" });
    }

    const [result] = await db.query(
      `INSERT INTO expenses
       (title, category, amount, expense_date, payment_method, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        category || "Other",
        Number(amount),
        expenseDate,
        paymentMethod || "Cash",
        description || null,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM expenses WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Expense created successfully",
      expense: rows[0],
    });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      description,
    } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Expense name is required" });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({ message: "Enter a valid expense amount" });
    }

    if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      return res.status(400).json({ message: "Valid expense date is required" });
    }

    const [result] = await db.query(
      `UPDATE expenses
       SET title = ?, category = ?, amount = ?, expense_date = ?,
           payment_method = ?, description = ?
       WHERE id = ?`,
      [
        String(title).trim(),
        category || "Other",
        Number(amount),
        expenseDate,
        paymentMethod || "Cash",
        description || null,
        Number(id),
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM expenses WHERE id = ?",
      [Number(id)]
    );

    res.status(200).json({
      message: "Expense updated successfully",
      expense: rows[0],
    });
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid expense ID" });
    }

    const [result] = await db.query(
      "DELETE FROM expenses WHERE id = ?",
      [Number(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
};