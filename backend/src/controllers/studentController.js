const prisma = require("../config/db");

// GET /api/students
// Supports optional query params: ?search=&gradeId=&sectionId=&status=
async function getStudents(req, res) {
  try {
    const { search, sectionId, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (sectionId) where.sectionId = Number(sectionId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { studentCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        section: { include: { gradeLevel: true } },
        guardian: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json(students);
  } catch (err) {
    console.error("getStudents error:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
}

// GET /api/students/:id
async function getStudentById(req, res) {
  try {
    const id = Number(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        section: { include: { gradeLevel: true } },
        guardian: { select: { id: true, name: true, email: true, phone: true } },
        gradeRecords: { include: { subject: true } },
        feeInvoices: true,
        attendances: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error("getStudentById error:", err);
    res.status(500).json({ error: "Failed to fetch student" });
  }
}

// POST /api/students
async function createStudent(req, res) {
  try {
    const { studentCode, name, dateOfBirth, sectionId, guardianId, status, guardianName, guardianPhone } = req.body;

    if (!studentCode || !name || !sectionId) {
      return res.status(400).json({ error: "studentCode, name and sectionId are required" });
    }

    const student = await prisma.student.create({
      data: {
        studentCode,
        name,
        dateOfBirth:   dateOfBirth ? new Date(dateOfBirth) : null,
        sectionId:     Number(sectionId),
        guardianId:    guardianId ? Number(guardianId) : null,
        status:        status || "ACTIVE",
        guardianName:  guardianName?.trim() || null,
        guardianPhone: guardianPhone?.trim() || null,
      },
      include: { section: { include: { gradeLevel: true } } },
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("createStudent error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Student code already exists" });
    }
    res.status(500).json({ error: "Failed to create student" });
  }
}

// PUT /api/students/:id
async function updateStudent(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, dateOfBirth, sectionId, guardianId, status, guardianName, guardianPhone } = req.body;

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name          !== undefined && { name }),
        ...(dateOfBirth   !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(sectionId     !== undefined && { sectionId: Number(sectionId) }),
        ...(guardianId    !== undefined && { guardianId: guardianId ? Number(guardianId) : null }),
        ...(status        !== undefined && { status }),
        ...(guardianName  !== undefined && { guardianName: guardianName?.trim() || null }),
        ...(guardianPhone !== undefined && { guardianPhone: guardianPhone?.trim() || null }),
      },
      include: { section: { include: { gradeLevel: true } } },
    });

    res.json(student);
  } catch (err) {
    console.error("updateStudent error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Student not found" });
    }
    res.status(500).json({ error: "Failed to update student" });
  }
}

// DELETE /api/students/:id
async function deleteStudent(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.student.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteStudent error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Student not found" });
    }
    res.status(500).json({ error: "Failed to delete student" });
  }
}

// POST /api/students/bulk
// Body: { students: [{ studentCode, name, grade, section, status, dateOfBirth, guardianName, guardianPhone }, ...] }
// `grade` is the GradeLevel name (e.g. "Grade 9") and `section` is the Section name (e.g. "A")
// Returns a per-row result so the frontend can show which rows succeeded/failed.
async function bulkImportStudents(req, res) {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "students array is required and cannot be empty" });
    }

    // Pre-load all sections so we can match "Grade 9" + "A" -> sectionId
    const allSections = await prisma.section.findMany({ include: { gradeLevel: true } });
    const sectionKey = (gradeName, sectionName) =>
      `${String(gradeName).trim().toLowerCase()}|${String(sectionName).trim().toLowerCase()}`;
    const sectionMap = new Map(
      allSections.map(s => [sectionKey(s.gradeLevel.name, s.name), s.id])
    );

    const results = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowNum = i + 1;

      try {
        const studentCode = String(row.studentCode || "").trim();
        const name        = String(row.name || "").trim();
        const gradeName   = String(row.grade || "").trim();
        const sectionName = String(row.section || "").trim();

        if (!studentCode || !name || !gradeName || !sectionName) {
          results.push({ row: rowNum, status: "error", error: "Missing required field(s): studentCode, name, grade, or section", data: row });
          continue;
        }

        const sectionId = sectionMap.get(sectionKey(gradeName, sectionName));
        if (!sectionId) {
          results.push({ row: rowNum, status: "error", error: `Section not found: "${gradeName} - ${sectionName}"`, data: row });
          continue;
        }

        // Skip if student code already exists
        const existing = await prisma.student.findUnique({ where: { studentCode } });
        if (existing) {
          results.push({ row: rowNum, status: "skipped", error: `Student code "${studentCode}" already exists`, data: row });
          continue;
        }

        let status = String(row.status || "ACTIVE").trim().toUpperCase();
        if (!["ACTIVE", "INACTIVE", "GRADUATED", "TRANSFERRED"].includes(status)) {
          status = "ACTIVE";
        }

        let dateOfBirth = null;
        if (row.dateOfBirth) {
          const d = new Date(row.dateOfBirth);
          if (!isNaN(d.getTime())) dateOfBirth = d;
        }

        const created = await prisma.student.create({
          data: {
            studentCode,
            name,
            sectionId,
            status,
            dateOfBirth,
            guardianName:  row.guardianName  ? String(row.guardianName).trim()  : null,
            guardianPhone: row.guardianPhone ? String(row.guardianPhone).trim() : null,
          },
        });

        results.push({ row: rowNum, status: "created", student: created });
      } catch (err) {
        console.error(`bulkImportStudents row ${rowNum} error:`, err);
        results.push({ row: rowNum, status: "error", error: err.message || "Unknown error", data: row });
      }
    }

    const summary = {
      total:   results.length,
      created: results.filter(r => r.status === "created").length,
      skipped: results.filter(r => r.status === "skipped").length,
      errors:  results.filter(r => r.status === "error").length,
    };

    res.json({ summary, results });
  } catch (err) {
    console.error("bulkImportStudents error:", err);
    res.status(500).json({ error: "Failed to import students" });
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
};
