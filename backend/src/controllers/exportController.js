const XLSX = require("xlsx");
const prisma = require("../config/db");

// Helper: format a Date or null for spreadsheet cells
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDateTime = (d) => (d ? new Date(d).toISOString() : "");

// ── Sheet builders ────────────────────────────────────────────────
// Each builder fetches its own data and returns { name, rows } (or an
// array of these). Reused by both per-page exports and "export all".

async function buildStudentsSheet() {
  const students = await prisma.student.findMany({
    include: {
      section: { include: { gradeLevel: true } },
      guardian: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { id: "asc" },
  });
  const rows = students.map(s => ({
    "Student Code":   s.studentCode,
    "Name":           s.name,
    "Grade":          s.section?.gradeLevel?.name || "",
    "Section":        s.section?.name || "",
    "Status":         s.status,
    "Date of Birth":  fmtDate(s.dateOfBirth),
    "Enrollment Date": fmtDate(s.enrollmentDate),
    "Guardian Name":  s.guardianName || s.guardian?.name || "",
    "Guardian Phone": s.guardianPhone || s.guardian?.phone || "",
    "Guardian Email": s.guardian?.email || "",
  }));
  return { name: "Students", rows };
}

async function buildTeachersSheet() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      subjects: { include: { subject: true } },
    },
    orderBy: { id: "asc" },
  });
  const rows = teachers.map(t => ({
    "Name":     t.user?.name || "",
    "Email":    t.user?.email || "",
    "Phone":    t.user?.phone || "",
    "Status":   t.status,
    "Base Salary": t.baseSalary != null ? Number(t.baseSalary) : "",
    "Subjects": t.subjects.map(ts => ts.subject.name).join(", "),
  }));
  return { name: "Teachers", rows };
}

async function buildEmployeesSheet() {
  const employees = await prisma.employee.findMany({
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { id: "asc" },
  });
  const rows = employees.map(e => ({
    "Name":     e.user?.name || "",
    "Email":    e.user?.email || "",
    "Phone":    e.user?.phone || "",
    "Job Title": e.jobTitle,
    "Status":   e.status,
    "Base Salary": e.baseSalary != null ? Number(e.baseSalary) : "",
  }));
  return { name: "Employees", rows };
}

async function buildSectionsSheet() {
  const sections = await prisma.section.findMany({ include: { gradeLevel: true }, orderBy: { id: "asc" } });
  const rows = sections.map(sec => ({
    "Grade":   sec.gradeLevel.name,
    "Section": sec.name,
  }));
  return { name: "Sections", rows };
}

async function buildSubjectsSheet() {
  const subjects = await prisma.subject.findMany({ orderBy: { id: "asc" } });
  const rows = subjects.map(sub => ({
    "Name":  sub.name,
    "Code":  sub.code || "",
    "Color": sub.color || "",
  }));
  return { name: "Subjects", rows };
}

async function buildAttendanceSheet() {
  const attendance = await prisma.attendance.findMany({
    include: { student: { select: { name: true, studentCode: true } } },
    orderBy: { date: "desc" },
    take: 5000,
  });
  const rows = attendance.map(a => ({
    "Date":         fmtDate(a.date),
    "Student Code": a.student?.studentCode || "",
    "Student Name": a.student?.name || "",
    "Status":       a.status,
  }));
  return { name: "Attendance", rows };
}

async function buildGradesSheet() {
  const gradeRecords = await prisma.gradeRecord.findMany({
    include: {
      student: { select: { name: true, studentCode: true } },
      subject: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });
  const rows = gradeRecords.map(g => ({
    "Student Code": g.student?.studentCode || "",
    "Student Name": g.student?.name || "",
    "Subject":      g.subject?.name || "",
    "Term":         g.term,
    "Score":        Number(g.score),
    "Max Score":    Number(g.maxScore),
  }));
  return { name: "Grades", rows };
}

async function buildFeesSheets() {
  const [feeInvoices, payments] = await Promise.all([
    prisma.feeInvoice.findMany({
      include: { student: { select: { name: true, studentCode: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.payment.findMany({
      include: {
        invoice: {
          select: {
            description: true,
            student: { select: { name: true, studentCode: true } },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const invoicesRows = feeInvoices.map(inv => ({
    "Invoice ID":    inv.id,
    "Student Code":  inv.student?.studentCode || "",
    "Student Name":  inv.student?.name || "",
    "Description":   inv.description,
    "Amount":        Number(inv.amount),
    "Total Paid":    Number(inv.totalPaid),
    "Balance":       Number(inv.amount) - Number(inv.totalPaid),
    "Due Date":      fmtDate(inv.dueDate),
    "Status":        inv.status,
    "Created":       fmtDateTime(inv.createdAt),
  }));

  const paymentsRows = payments.map(p => ({
    "Payment ID":    p.id,
    "Invoice ID":    p.invoiceId,
    "Student Code":  p.invoice?.student?.studentCode || "",
    "Student Name":  p.invoice?.student?.name || "",
    "Description":   p.invoice?.description || "",
    "Amount":        Number(p.amount),
    "Paid Date":     fmtDate(p.paidDate),
    "Note":          p.note || "",
  }));

  return [
    { name: "Fee Invoices", rows: invoicesRows },
    { name: "Payments", rows: paymentsRows },
  ];
}

async function buildPayrollSheet() {
  const payments = await prisma.salaryPayment.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "asc" }],
  });
  const rows = payments.map(p => ({
    "Name":      p.user?.name || "",
    "Email":     p.user?.email || "",
    "Month":     p.month,
    "Year":      p.year,
    "Base Amount": Number(p.baseAmount),
    "Bonus":     Number(p.bonus),
    "Bonus Note": p.bonusNote || "",
    "Deduction": Number(p.deduction),
    "Deduction Note": p.deductionNote || "",
    "Net Amount": Number(p.netAmount),
    "Status":    p.status,
    "Paid Date": fmtDate(p.paidDate),
    "Note":      p.note || "",
  }));
  return { name: "Payroll", rows };
}

async function buildExpensesSheet() {
  const expenses = await prisma.expense.findMany({
    include: { recordedBy: { select: { name: true } } },
    orderBy: { expenseDate: "desc" },
  });
  const rows = expenses.map(e => ({
    "Date":        fmtDate(e.expenseDate),
    "Description": e.description,
    "Category":    e.category,
    "Amount":      Number(e.amount),
    "Vendor":      e.vendor || "",
    "Payment Method": e.paymentMethod || "",
    "Status":      e.status,
    "Paid Date":   fmtDate(e.paidDate),
    "Note":        e.note || "",
    "Recorded By": e.recordedBy?.name || "",
  }));
  return { name: "Expenses", rows };
}

async function buildAnnouncementsSheet() {
  const announcements = await prisma.announcement.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  const rows = announcements.map(a => ({
    "Title":    a.title,
    "Body":     a.body || "",
    "Type":     a.type,
    "Priority": a.priority,
    "Author":   a.author?.name || "",
    "Created":  fmtDateTime(a.createdAt),
  }));
  return { name: "Announcements", rows };
}

async function buildUsersSheet() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  const rows = users.map(u => ({
    "Name":    u.name,
    "Email":   u.email,
    "Role":    u.role,
    "Phone":   u.phone || "",
    "Active":  u.isActive ? "Yes" : "No",
    "Created": fmtDateTime(u.createdAt),
  }));
  return { name: "Users", rows };
}

// ── Helpers ──────────────────────────────────────────────────────

// Builds a workbook from a list of { name, rows } sheets (or arrays of
// these) and streams it as a download.
function sendWorkbook(res, sheets, filenamePrefix) {
  const wb = XLSX.utils.book_new();
  const flat = sheets.flat();

  for (const sheet of flat) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ "No data": "—" }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet.name.slice(0, 31));
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const timestamp = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="scube-${filenamePrefix}-${timestamp}.xlsx"`);
  res.send(buffer);
}

// Generic wrapper: runs a builder (or array of builders), sends the result.
function makeExportHandler(buildersFn, filenamePrefix) {
  return async (req, res) => {
    try {
      const result = await buildersFn();
      sendWorkbook(res, Array.isArray(result) ? result : [result], filenamePrefix);
    } catch (err) {
      console.error(`export ${filenamePrefix} error:`, err);
      res.status(500).json({ error: "Failed to generate export" });
    }
  };
}

// ── Route handlers ───────────────────────────────────────────────

const exportStudents      = makeExportHandler(buildStudentsSheet, "students");
const exportTeachers      = makeExportHandler(buildTeachersSheet, "teachers");
const exportEmployees     = makeExportHandler(buildEmployeesSheet, "employees");
const exportSections      = makeExportHandler(buildSectionsSheet, "classes");
const exportAttendance    = makeExportHandler(buildAttendanceSheet, "attendance");
const exportGrades        = makeExportHandler(buildGradesSheet, "grades");
const exportFees          = makeExportHandler(buildFeesSheets, "fees");
const exportPayroll       = makeExportHandler(buildPayrollSheet, "payroll");
const exportExpenses      = makeExportHandler(buildExpensesSheet, "expenses");
const exportAnnouncements = makeExportHandler(buildAnnouncementsSheet, "announcements");
const exportUsers         = makeExportHandler(buildUsersSheet, "users");

// GET /api/export/all
// Generates a multi-sheet Excel workbook containing all ERP data.
async function exportAll(req, res) {
  try {
    const sheets = await Promise.all([
      buildStudentsSheet(),
      buildTeachersSheet(),
      buildEmployeesSheet(),
      buildSectionsSheet(),
      buildSubjectsSheet(),
      buildAttendanceSheet(),
      buildGradesSheet(),
      buildFeesSheets(),       // returns array of 2 sheets
      buildPayrollSheet(),
      buildExpensesSheet(),
      buildAnnouncementsSheet(),
      buildUsersSheet(),
    ]);
    sendWorkbook(res, sheets, "backup");
  } catch (err) {
    console.error("exportAll error:", err);
    res.status(500).json({ error: "Failed to generate export" });
  }
}

module.exports = {
  exportAll,
  exportStudents,
  exportTeachers,
  exportEmployees,
  exportSections,
  exportAttendance,
  exportGrades,
  exportFees,
  exportPayroll,
  exportExpenses,
  exportAnnouncements,
  exportUsers,
};
