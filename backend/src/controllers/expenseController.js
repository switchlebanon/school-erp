const prisma = require("../config/db");

const CATEGORIES = [
  "UTILITIES", "SUPPLIES", "MAINTENANCE", "RENT", "TRANSPORTATION",
  "EQUIPMENT", "MARKETING", "INSURANCE", "OTHER",
];

const expenseInclude = {
  recordedBy: { select: { id: true, name: true } },
};

// GET /api/expenses
// Optional query: ?month=&year=&category=&status=
async function getExpenses(req, res) {
  try {
    const { month, year, category, status } = req.query;

    const where = {};
    if (category && category !== "ALL") where.category = category;
    if (status && status !== "ALL") where.status = status;

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.expenseDate = { gte: start, lt: end };
    } else if (year) {
      const y = Number(year);
      where.expenseDate = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { expenseDate: "desc" },
    });

    res.json(expenses.map(formatExpense));
  } catch (err) {
    console.error("getExpenses error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
}

// GET /api/expenses/summary?month=&year=
// Returns totals by status and by category for the given month/year.
async function getExpenseSummary(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const m = Number(month);
    const y = Number(year);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: start, lt: end } },
    });

    const totals = expenses.reduce((acc, e) => {
      const amt = Number(e.amount);
      acc.total += amt;
      if (e.status === "PAID") acc.paid += amt;
      else if (e.status === "PENDING") acc.pending += amt;
      else acc.cancelled += amt;

      acc.byCategory[e.category] = (acc.byCategory[e.category] || 0) + amt;
      return acc;
    }, { total: 0, paid: 0, pending: 0, cancelled: 0, byCategory: {} });

    res.json({
      ...totals,
      count: expenses.length,
      byCategory: Object.entries(totals.byCategory).map(([category, amount]) => ({ category, amount })),
    });
  } catch (err) {
    console.error("getExpenseSummary error:", err);
    res.status(500).json({ error: "Failed to fetch expense summary" });
  }
}

// GET /api/expenses/:id
async function getExpenseById(req, res) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: Number(req.params.id) },
      include: expenseInclude,
    });
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    res.json(formatExpense(expense));
  } catch (err) {
    console.error("getExpenseById error:", err);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
}

// POST /api/expenses
// Body: { category, description, amount, vendor?, paymentMethod?, status?, expenseDate, note? }
async function createExpense(req, res) {
  try {
    const { category, description, amount, vendor, paymentMethod, status, expenseDate, note } = req.body;

    if (!description || amount === undefined || !expenseDate) {
      return res.status(400).json({ error: "description, amount and expenseDate are required" });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const finalStatus = status || "PENDING";

    const expense = await prisma.expense.create({
      data: {
        category: category || "OTHER",
        description: String(description).trim(),
        amount: Number(amount),
        vendor: vendor ? String(vendor).trim() : null,
        paymentMethod: paymentMethod ? String(paymentMethod).trim() : null,
        status: finalStatus,
        expenseDate: new Date(expenseDate),
        paidDate: finalStatus === "PAID" ? new Date() : null,
        note: note ? String(note).trim() : null,
        recordedById: req.user.id,
      },
      include: expenseInclude,
    });

    res.status(201).json(formatExpense(expense));
  } catch (err) {
    console.error("createExpense error:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
}

// PUT /api/expenses/:id
async function updateExpense(req, res) {
  try {
    const id = Number(req.params.id);
    const { category, description, amount, vendor, paymentMethod, status, expenseDate, note } = req.body;

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Expense not found" });

    const newStatus = status !== undefined ? status : existing.status;
    let paidDate = existing.paidDate;
    if (newStatus === "PAID" && existing.status !== "PAID") paidDate = new Date();
    if (newStatus !== "PAID") paidDate = null;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description: String(description).trim() }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(vendor !== undefined && { vendor: vendor ? String(vendor).trim() : null }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod ? String(paymentMethod).trim() : null }),
        ...(status !== undefined && { status: newStatus, paidDate }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(note !== undefined && { note: note ? String(note).trim() : null }),
      },
      include: expenseInclude,
    });

    res.json(formatExpense(expense));
  } catch (err) {
    console.error("updateExpense error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Expense not found" });
    res.status(500).json({ error: "Failed to update expense" });
  }
}

// DELETE /api/expenses/:id
async function deleteExpense(req, res) {
  try {
    await prisma.expense.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteExpense error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Expense not found" });
    res.status(500).json({ error: "Failed to delete expense" });
  }
}

function formatExpense(e) {
  return {
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    vendor: e.vendor,
    paymentMethod: e.paymentMethod,
    status: e.status,
    expenseDate: e.expenseDate,
    paidDate: e.paidDate,
    note: e.note,
    recordedBy: e.recordedBy?.name || null,
    createdAt: e.createdAt,
  };
}

module.exports = {
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
