const XLSX = require("xlsx");
const prisma = require("../config/db");

// Helper: format a Date or null for spreadsheet cells
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDateTime = (d) => (d ? new Date(d).toISOString() : "");

// GET /api/export/all
// Generates a multi-sheet Excel workbook containing all ERP data
// and streams it back as a downloadable .xlsx file.
async function exportAll(req, res) {
  try {
    const [
      students,
      teachers,
      sections,
      subjects,
      gradeLevels,
      attendance,
      gradeRecords,
      feeInvoices,
      payments,
      announcements,
      users,
    ] = await Promise.all([
      prisma.student.findMany({
        include: {
          section: { include: { gradeLevel: true } },
          guardian: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.teacher.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          subjects: { include: { subject: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.section.findMany({ include: { gradeLevel: true }, orderBy: { id: "asc" } }),
      prisma.subject.findMany({ orderBy: { id: "asc" } }),
      prisma.gradeLevel.findMany({ orderBy: { order: "asc" } }),
      prisma.attendance.findMany({
        include: { student: { select: { name: true, studentCode: true } } },
        orderBy: { date: "desc" },
        take: 5000, // safety cap
      }),
      prisma.gradeRecord.findMany({
        include: {
          student: { select: { name: true, studentCode: true } },
          subject: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.feeInvoice.findMany({
        include: {
          student: { select: { name: true, studentCode: true } },
        },
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
      prisma.announcement.findMany({
        include: { author: { select: { name: true } } },
        orderBy: { id: "asc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const wb = XLSX.utils.book_new();

    // ── Students ──
    const studentsData = students.map(s => ({
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentsData), "Students");

    // ── Teachers ──
    const teachersData = teachers.map(t => ({
      "Name":     t.user?.name || "",
      "Email":    t.user?.email || "",
      "Phone":    t.user?.phone || "",
      "Status":   t.status,
      "Subjects": t.subjects.map(ts => ts.subject.name).join(", "),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teachersData), "Teachers");

    // ── Sections / Grade Levels ──
    const sectionsData = sections.map(sec => ({
      "Grade":   sec.gradeLevel.name,
      "Section": sec.name,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sectionsData), "Sections");

    // ── Subjects ──
    const subjectsData = subjects.map(sub => ({
      "Name":  sub.name,
      "Code":  sub.code || "",
      "Color": sub.color || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subjectsData), "Subjects");

    // ── Attendance ──
    const attendanceData = attendance.map(a => ({
      "Date":         fmtDate(a.date),
      "Student Code": a.student?.studentCode || "",
      "Student Name": a.student?.name || "",
      "Status":       a.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceData), "Attendance");

    // ── Grades ──
    const gradesData = gradeRecords.map(g => ({
      "Student Code": g.student?.studentCode || "",
      "Student Name": g.student?.name || "",
      "Subject":      g.subject?.name || "",
      "Term":         g.term,
      "Score":        Number(g.score),
      "Max Score":    Number(g.maxScore),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gradesData), "Grades");

    // ── Fee Invoices ──
    const invoicesData = feeInvoices.map(inv => ({
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoicesData), "Fee Invoices");

    // ── Payments ──
    const paymentsData = payments.map(p => ({
      "Payment ID":    p.id,
      "Invoice ID":    p.invoiceId,
      "Student Code":  p.invoice?.student?.studentCode || "",
      "Student Name":  p.invoice?.student?.name || "",
      "Description":   p.invoice?.description || "",
      "Amount":        Number(p.amount),
      "Paid Date":     fmtDate(p.paidDate),
      "Note":          p.note || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), "Payments");

    // ── Announcements ──
    const announcementsData = announcements.map(a => ({
      "Title":    a.title,
      "Body":     a.body || "",
      "Type":     a.type,
      "Priority": a.priority,
      "Author":   a.author?.name || "",
      "Created":  fmtDateTime(a.createdAt),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(announcementsData), "Announcements");

    // ── Users ──
    const usersData = users.map(u => ({
      "Name":    u.name,
      "Email":   u.email,
      "Role":    u.role,
      "Phone":   u.phone || "",
      "Active":  u.isActive ? "Yes" : "No",
      "Created": fmtDateTime(u.createdAt),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersData), "Users");

    // ── Build buffer and stream as download ──
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const timestamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="schoolhub-backup-${timestamp}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error("exportAll error:", err);
    res.status(500).json({ error: "Failed to generate export" });
  }
}

module.exports = { exportAll };
