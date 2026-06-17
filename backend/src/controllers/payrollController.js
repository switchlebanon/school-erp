const prisma = require("../config/db");

// Helper: compute net amount
const computeNet = (base, bonus, deduction) =>
  Number(base || 0) + Number(bonus || 0) - Number(deduction || 0);

// GET /api/payroll?month=&year=
// Returns every staff member (teachers + employees) with their salary
// payment for the given month/year (or null if not yet recorded).
async function getPayrollForMonth(req, res) {
  try {
    const month = Number(req.query.month);
    const year  = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const [teachers, employees, payments] = await Promise.all([
      prisma.teacher.findMany({
        where: { status: { not: "INACTIVE" } },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      }),
      prisma.employee.findMany({
        where: { status: { not: "INACTIVE" } },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      }),
      prisma.salaryPayment.findMany({ where: { month, year } }),
    ]);

    const paymentMap = new Map(payments.map(p => [p.userId, p]));

    const staff = [
      ...teachers.map(t => ({
        userId: t.user.id,
        name: t.user.name,
        email: t.user.email,
        phone: t.user.phone || null,
        role: "TEACHER",
        title: "Teacher",
        baseSalary: t.baseSalary !== null ? Number(t.baseSalary) : null,
        refId: t.id,
      })),
      ...employees.map(e => ({
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        phone: e.user.phone || null,
        role: "EMPLOYEE",
        title: e.jobTitle,
        baseSalary: e.baseSalary !== null ? Number(e.baseSalary) : null,
        refId: e.id,
      })),
    ];

    const result = staff.map(s => {
      const payment = paymentMap.get(s.userId);
      return {
        ...s,
        payment: payment ? {
          id: payment.id,
          baseAmount: Number(payment.baseAmount),
          bonus: Number(payment.bonus),
          bonusNote: payment.bonusNote,
          deduction: Number(payment.deduction),
          deductionNote: payment.deductionNote,
          netAmount: Number(payment.netAmount),
          status: payment.status,
          paidDate: payment.paidDate,
          note: payment.note,
        } : null,
      };
    });

    // Sort: Teachers first, then Employees, alphabetically within each
    result.sort((a, b) => {
      if (a.role !== b.role) return a.role === "TEACHER" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json(result);
  } catch (err) {
    console.error("getPayrollForMonth error:", err);
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
}

// POST /api/payroll
// Body: { userId, month, year, baseAmount, bonus?, bonusNote?, deduction?, deductionNote?, status?, note? }
// Upserts a salary payment record for a staff member for a given month.
async function savePayrollEntry(req, res) {
  try {
    const { userId, month, year, baseAmount, bonus, bonusNote, deduction, deductionNote, status, note } = req.body;

    if (!userId || !month || !year || baseAmount === undefined) {
      return res.status(400).json({ error: "userId, month, year and baseAmount are required" });
    }

    const netAmount = computeNet(baseAmount, bonus, deduction);

    // Link to Employee record if this user is an employee
    const employee = await prisma.employee.findUnique({ where: { userId: Number(userId) } });

    const finalStatus = status || "PENDING";
    const paidDate = finalStatus === "PAID" ? new Date() : null;

    const payment = await prisma.salaryPayment.upsert({
      where: { userId_month_year: { userId: Number(userId), month: Number(month), year: Number(year) } },
      update: {
        baseAmount: Number(baseAmount),
        bonus: Number(bonus || 0),
        bonusNote: bonusNote || null,
        deduction: Number(deduction || 0),
        deductionNote: deductionNote || null,
        netAmount,
        status: finalStatus,
        ...(finalStatus === "PAID" && { paidDate: paidDate }),
        ...(finalStatus !== "PAID" && { paidDate: null }),
        note: note || null,
      },
      create: {
        userId: Number(userId),
        employeeId: employee?.id || null,
        month: Number(month),
        year: Number(year),
        baseAmount: Number(baseAmount),
        bonus: Number(bonus || 0),
        bonusNote: bonusNote || null,
        deduction: Number(deduction || 0),
        deductionNote: deductionNote || null,
        netAmount,
        status: finalStatus,
        paidDate,
        note: note || null,
      },
    });

    res.json({
      id: payment.id,
      baseAmount: Number(payment.baseAmount),
      bonus: Number(payment.bonus),
      bonusNote: payment.bonusNote,
      deduction: Number(payment.deduction),
      deductionNote: payment.deductionNote,
      netAmount: Number(payment.netAmount),
      status: payment.status,
      paidDate: payment.paidDate,
      note: payment.note,
    });
  } catch (err) {
    console.error("savePayrollEntry error:", err);
    res.status(500).json({ error: "Failed to save payroll entry" });
  }
}

// GET /api/payroll/history/:userId
// Returns all salary payments for a given user, most recent first.
async function getPayrollHistory(req, res) {
  try {
    const userId = Number(req.params.userId);

    const payments = await prisma.salaryPayment.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    res.json(payments.map(p => ({
      id: p.id,
      month: p.month,
      year: p.year,
      baseAmount: Number(p.baseAmount),
      bonus: Number(p.bonus),
      bonusNote: p.bonusNote,
      deduction: Number(p.deduction),
      deductionNote: p.deductionNote,
      netAmount: Number(p.netAmount),
      status: p.status,
      paidDate: p.paidDate,
      note: p.note,
    })));
  } catch (err) {
    console.error("getPayrollHistory error:", err);
    res.status(500).json({ error: "Failed to fetch payroll history" });
  }
}

// GET /api/payroll/summary?month=&year=
// Returns totals for the month: total base, total bonuses, total deductions, total net, counts by status.
async function getPayrollSummary(req, res) {
  try {
    const month = Number(req.query.month);
    const year  = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }

    const payments = await prisma.salaryPayment.findMany({ where: { month, year } });

    const totals = payments.reduce((acc, p) => {
      acc.base += Number(p.baseAmount);
      acc.bonus += Number(p.bonus);
      acc.deduction += Number(p.deduction);
      acc.net += Number(p.netAmount);
      if (p.status === "PAID") acc.paidCount++;
      else if (p.status === "PENDING") acc.pendingCount++;
      else acc.cancelledCount++;
      return acc;
    }, { base: 0, bonus: 0, deduction: 0, net: 0, paidCount: 0, pendingCount: 0, cancelledCount: 0 });

    const [teacherCount, employeeCount] = await Promise.all([
      prisma.teacher.count({ where: { status: { not: "INACTIVE" } } }),
      prisma.employee.count({ where: { status: { not: "INACTIVE" } } }),
    ]);

    res.json({ ...totals, totalStaff: teacherCount + employeeCount, recordedCount: payments.length });
  } catch (err) {
    console.error("getPayrollSummary error:", err);
    res.status(500).json({ error: "Failed to fetch payroll summary" });
  }
}

module.exports = {
  getPayrollForMonth,
  savePayrollEntry,
  getPayrollHistory,
  getPayrollSummary,
};
