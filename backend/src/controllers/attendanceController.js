const prisma = require("../config/db");

// GET /api/attendance?sectionId=&date=YYYY-MM-DD
// Returns every active student in the section with their attendance status
// for the given date (defaults to "PRESENT" if no record exists yet).
async function getAttendanceForClass(req, res) {
  try {
    const { sectionId, date } = req.query;

    if (!sectionId || !date) {
      return res.status(400).json({ error: "sectionId and date are required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const students = await prisma.student.findMany({
      where: { sectionId: Number(sectionId), status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, studentCode: true, name: true },
    });

    const records = await prisma.attendance.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        date: targetDate,
      },
    });
    const recordMap = new Map(records.map(r => [r.studentId, r]));

    const result = students.map(s => {
      const rec = recordMap.get(s.id);
      return {
        studentId:   s.id,
        studentCode: s.studentCode,
        name:        s.name,
        status:      rec?.status || null, // null = not yet marked
        reason:      rec?.reason || null,
        recordId:    rec?.id || null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getAttendanceForClass error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
}

// POST /api/attendance/bulk
// Body: { date, records: [{ studentId, status }] }
// Upserts an attendance record per student for the given date.
async function saveAttendanceBulk(req, res) {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: "date and records[] are required" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
    const results = [];

    for (const r of records) {
      const { studentId, status, reason } = r;
      if (studentId == null) continue;

      if (!VALID_STATUSES.includes(status)) {
        results.push({ studentId, status: "error", error: "Invalid status" });
        continue;
      }

      // Only persist a reason for ABSENT/EXCUSED/LATE; clear it for PRESENT
      const finalReason = status === "PRESENT" ? null : (reason ? String(reason).trim() || null : null);

      const record = await prisma.attendance.upsert({
        where: {
          studentId_date: { studentId: Number(studentId), date: targetDate },
        },
        update: { status, reason: finalReason, markedById: req.user.id },
        create: {
          studentId: Number(studentId),
          date: targetDate,
          status,
          reason: finalReason,
          markedById: req.user.id,
        },
      });

      results.push({ studentId, status: "saved", id: record.id });
    }

    const summary = {
      saved: results.filter(r => r.status === "saved").length,
      errors: results.filter(r => r.status === "error").length,
    };

    res.json({ summary, results });
  } catch (err) {
    console.error("saveAttendanceBulk error:", err);
    res.status(500).json({ error: "Failed to save attendance" });
  }
}

// GET /api/attendance/student/:studentId?limit=30
// Returns recent attendance history for a student.
// PARENT/STUDENT can only view their own linked student's record.
async function getStudentAttendance(req, res) {
  try {
    const studentId = Number(req.params.studentId);
    const limit = req.query.limit ? Number(req.query.limit) : 30;

    if (req.user.role === "PARENT" || req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.guardianId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this student's attendance" });
      }
    }

    const records = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      take: limit,
    });

    res.json(records.map(r => ({
      id: r.id,
      date: r.date,
      status: r.status,
      reason: r.reason,
    })));
  } catch (err) {
    console.error("getStudentAttendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance history" });
  }
}

// GET /api/attendance/summary?sectionId=&date=
// Returns counts per status for a class on a given date (for quick stats).
async function getAttendanceSummary(req, res) {
  try {
    const { sectionId, date } = req.query;
    if (!sectionId || !date) {
      return res.status(400).json({ error: "sectionId and date are required" });
    }

    const targetDate = new Date(date);
    const students = await prisma.student.findMany({
      where: { sectionId: Number(sectionId), status: "ACTIVE" },
      select: { id: true },
    });
    const studentIds = students.map(s => s.id);

    const records = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, date: targetDate },
    });

    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    records.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });

    res.json({
      total: studentIds.length,
      marked: records.length,
      unmarked: studentIds.length - records.length,
      ...counts,
    });
  } catch (err) {
    console.error("getAttendanceSummary error:", err);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
}

// Determines the academic year range for a given date (or now).
// Academic year runs Sept 1 -> Aug 31. e.g. a date in Oct 2026 -> {start: 2026-09-01, end: 2027-08-31, label: "2026-2027"}
function academicYearRange(refDate = new Date()) {
  const d = new Date(refDate);
  const year = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; // Sept = month index 8
  const start = new Date(year, 8, 1);       // Sept 1
  const end = new Date(year + 1, 7, 31, 23, 59, 59); // Aug 31
  return { start, end, label: `${year}-${year + 1}` };
}

// GET /api/attendance/yearly/:studentId?year=2026
// Returns the absence counter for a student for an academic year:
// - totalAbsences: ABSENT days (count toward the limit)
// - excusedAbsences: EXCUSED days with a reason (don't count toward the limit)
// - lateCount, presentCount
// - records: list of non-present days with reason, for review
async function getYearlyAbsenceSummary(req, res) {
  try {
    const studentId = Number(req.params.studentId);

    if (req.user.role === "PARENT" || req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.guardianId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this student's attendance" });
      }
    }

    // Determine academic year range. ?year=2026 means the year starting Sept 2026.
    let refDate = new Date();
    if (req.query.year) {
      refDate = new Date(Number(req.query.year), 9, 1); // Oct 1 of that year, safely inside the range
    }
    const { start, end, label } = academicYearRange(refDate);

    const records = await prisma.attendance.findMany({
      where: { studentId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    records.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });

    const nonPresent = records
      .filter(r => r.status !== "PRESENT")
      .map(r => ({ id: r.id, date: r.date, status: r.status, reason: r.reason }));

    res.json({
      academicYear: label,
      rangeStart: start,
      rangeEnd: end,
      counted: counts.ABSENT,        // absences that count toward the limit
      excused: counts.EXCUSED,       // excused (e.g. sick leave) — don't count
      late: counts.LATE,
      present: counts.PRESENT,
      totalMarkedDays: records.length,
      records: nonPresent,
    });
  } catch (err) {
    console.error("getYearlyAbsenceSummary error:", err);
    res.status(500).json({ error: "Failed to fetch yearly absence summary" });
  }
}

module.exports = {
  getAttendanceForClass,
  saveAttendanceBulk,
  getStudentAttendance,
  getAttendanceSummary,
  getYearlyAbsenceSummary,
};
