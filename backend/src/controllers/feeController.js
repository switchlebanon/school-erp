const prisma = require("../config/db");

const invoiceInclude = {
  student: { include: { section: { include: { gradeLevel: true } } } },
  payments: { orderBy: { paidDate: "asc" } },
};

// Helper: recalculate totalPaid and status after any payment change
async function recalcInvoice(invoiceId) {
  const payments = await prisma.payment.findMany({ where: { invoiceId } });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const invoice   = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
  const total     = Number(invoice.amount);

  let status = "PENDING";
  if (totalPaid >= total) {
    status = "PAID";
  } else if (new Date(invoice.dueDate) < new Date() && totalPaid < total) {
    status = "OVERDUE";
  }

  return prisma.feeInvoice.update({
    where: { id: invoiceId },
    data: { totalPaid, status },
    include: invoiceInclude,
  });
}

// GET /api/fees
async function getFees(req, res) {
  try {
    const { studentId, status } = req.query;
    const where = {};
    if (studentId) where.studentId = Number(studentId);
    if (status && status !== "ALL") where.status = status;

    const invoices = await prisma.feeInvoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { dueDate: "asc" },
    });

    res.json(invoices);
  } catch (err) {
    console.error("getFees error:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
}

// GET /api/fees/summary
async function getFeeSummary(req, res) {
  try {
    const [paidAgg, pendingAgg, overdueAgg] = await Promise.all([
      prisma.feeInvoice.aggregate({ where: { status: "PAID" },    _sum: { totalPaid: true } }),
      prisma.feeInvoice.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }    }),
      prisma.feeInvoice.aggregate({ where: { status: "OVERDUE" }, _sum: { amount: true }    }),
    ]);

    // Also get partial payments collected on non-PAID invoices
    const partialAgg = await prisma.feeInvoice.aggregate({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { totalPaid: true },
    });

    res.json({
      collected: Number(paidAgg._sum.totalPaid    || 0) + Number(partialAgg._sum.totalPaid || 0),
      pending:   Number(pendingAgg._sum.amount    || 0),
      overdue:   Number(overdueAgg._sum.amount    || 0),
    });
  } catch (err) {
    console.error("getFeeSummary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
}

// GET /api/fees/:id
async function getFeeById(req, res) {
  try {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: Number(req.params.id) },
      include: invoiceInclude,
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("getFeeById error:", err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
}

// POST /api/fees  — create a new invoice (no payments yet)
async function createFee(req, res) {
  try {
    const { studentId, description, amount, dueDate } = req.body;
    if (!studentId || !description || !amount || !dueDate) {
      return res.status(400).json({ error: "studentId, description, amount and dueDate are required" });
    }

    const due = new Date(dueDate);
    const status = due < new Date() ? "OVERDUE" : "PENDING";

    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId:   Number(studentId),
        description: description.trim(),
        amount:      Number(amount),
        dueDate:     due,
        status,
        totalPaid:   0,
      },
      include: invoiceInclude,
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("createFee error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
}

// POST /api/fees/:id/pay  — add one installment payment
async function recordPayment(req, res) {
  try {
    const invoiceId = Number(req.params.id);
    const { amount, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "PAID") {
      return res.status(400).json({ error: "Invoice is already fully paid" });
    }

    const remaining = Number(invoice.amount) - Number(invoice.totalPaid);
    if (Number(amount) > remaining) {
      return res.status(400).json({
        error: `Payment exceeds remaining balance of $${remaining.toFixed(2)}`,
      });
    }

    // Create the payment record
    await prisma.payment.create({
      data: { invoiceId, amount: Number(amount), note: note?.trim() || null },
    });

    // Recalculate invoice totals and status
    const updated = await recalcInvoice(invoiceId);
    res.json(updated);
  } catch (err) {
    console.error("recordPayment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
}

// DELETE /api/fees/payments/:paymentId  — delete a specific payment
async function deletePayment(req, res) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: Number(req.params.paymentId) },
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    await prisma.payment.delete({ where: { id: payment.id } });
    const updated = await recalcInvoice(payment.invoiceId);
    res.json(updated);
  } catch (err) {
    console.error("deletePayment error:", err);
    res.status(500).json({ error: "Failed to delete payment" });
  }
}

// DELETE /api/fees/:id
async function deleteFee(req, res) {
  try {
    await prisma.feeInvoice.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Invoice not found" });
    res.status(500).json({ error: "Failed to delete invoice" });
  }
}

module.exports = { getFees, getFeeSummary, getFeeById, createFee, recordPayment, deletePayment, deleteFee };
