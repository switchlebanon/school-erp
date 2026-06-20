const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

// ── Auto-generated student login credentials ──────────────────────

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// Builds a login email from a student code
function studentEmailFromCode(studentCode) {
  const slug = String(studentCode).trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `${slug}@students.scube.local`;
}

/**
 * Builds a parent login email from guardian name.
 * Format: firstname.lastname@parents.s3.local
 * If taken: firstname.X.lastname@parents.s3.local (X = student's last name first letter)
 *
 * e.g. "Hassan Khalil" -> hassan.khalil@parents.s3.local
 * if taken + student name "Chloe Deeb" -> hassan.d.khalil@parents.s3.local
 */
async function buildParentEmail(guardianName, studentName) {
  const parts = String(guardianName).trim().toLowerCase().split(/\s+/).map(p => p.replace(/[^a-z]/g, ""));
  const first = parts[0] || "parent";
  const last  = parts[parts.length - 1] || "user";

  const baseEmail = `${first}.${last}@parents.s3.local`;
  const existing  = await prisma.user.findUnique({ where: { email: baseEmail } });
  if (!existing) return baseEmail;

  // Add student's last name initial as middle disambiguator
  const studentParts = String(studentName || "").trim().toLowerCase().split(/\s+/);
  const studentLastInitial = (studentParts[studentParts.length - 1] || "x")[0];
  const altEmail = `${first}.${studentLastInitial}.${last}@parents.s3.local`;

  const existingAlt = await prisma.user.findUnique({ where: { email: altEmail } });
  if (!existingAlt) return altEmail;

  // Last resort: add a counter
  let counter = 2;
  while (true) {
    const countedEmail = `${first}.${last}${counter}@parents.s3.local`;
    const existingCounted = await prisma.user.findUnique({ where: { email: countedEmail } });
    if (!existingCounted) return countedEmail;
    counter++;
  }
}

/**
 * Finds or creates a PARENT-role user account for a guardian.
 * - If a PARENT user with the same phone number already exists → reuse it
 * - Otherwise → create a new account from guardian name
 * Returns { id, email, password?, isExisting }
 */
async function findOrCreateParentAccount(guardianName, guardianPhone, student) {
  const cleanPhone = String(guardianPhone).trim();

  // Look for an existing PARENT user with this phone number
  const existingByPhone = await prisma.user.findFirst({
    where: { role: "PARENT", phone: cleanPhone },
  });

  if (existingByPhone) {
    // Link this existing parent to the new student
    await prisma.student.update({
      where: { id: student.id },
      data:  { guardianId: existingByPhone.id },
    });
    return {
      id: existingByPhone.id,
      email: existingByPhone.email,
      isExisting: true, // no password to show — they already have one
    };
  }

  // No existing parent found — create a new account
  const email = await buildParentEmail(guardianName, student.name);
  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      name:     String(guardianName).trim(),
      email,
      password: hashed,
      role:     "PARENT",
      phone:    cleanPhone,
    },
  });

  await prisma.student.update({
    where: { id: student.id },
    data:  { guardianId: user.id },
  });

  return { id: user.id, email, password: plainPassword, isExisting: false };
}

/**
 * Creates a STUDENT-role user account for a given student record.
 */
async function createStudentAccount(student) {
  const email = studentEmailFromCode(student.studentCode);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return null;

  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: student.name,
      role: "STUDENT",
    },
  });

  await prisma.student.update({
    where: { id: student.id },
    data: { userId: user.id },
  });

  return { id: user.id, email, password: plainPassword };
}

// GET /api/students
// Supports optional query params: ?search=&gradeId=&sectionId=&status=
// PARENT/STUDENT roles are scoped to only their own linked student record(s).
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

    // Scope for non-staff roles
    if (req.user.role === "PARENT" || req.user.role === "STUDENT") {
      where.guardianId = req.user.id;
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
// PARENT/STUDENT can only access their own linked student record(s).
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

    // Scope check for non-staff roles
    if (req.user.role === "PARENT" || req.user.role === "STUDENT") {
      if (student.guardianId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this student" });
      }
    }

    res.json(student);
  } catch (err) {
    console.error("getStudentById error:", err);
    res.status(500).json({ error: "Failed to fetch student" });
  }
}

// Generates a student code: S3-YYYYMMDD-XXX
// e.g. S3-20150322-047
async function generateStudentCode(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const dobStr = dob.getFullYear().toString() +
    String(dob.getMonth() + 1).padStart(2, "0") +
    String(dob.getDate()).padStart(2, "0");

  // Count existing students to get next sequential number
  const count = await prisma.student.count();
  const seq = String(count + 1).padStart(3, "0");

  return `S3-${dobStr}-${seq}`;
}

// POST /api/students
async function createStudent(req, res) {
  try {
    const { name, dateOfBirth, sectionId, guardianId, status, guardianName, guardianPhone } = req.body;

    if (!name || !sectionId) {
      return res.status(400).json({ error: "name and sectionId are required" });
    }
    if (!dateOfBirth) {
      return res.status(400).json({ error: "Date of birth is required" });
    }
    if (!guardianName || !String(guardianName).trim()) {
      return res.status(400).json({ error: "Guardian name is required" });
    }
    if (!guardianPhone || !String(guardianPhone).trim()) {
      return res.status(400).json({ error: "Guardian WhatsApp number is required" });
    }

    // Auto-generate student code
    const studentCode = await generateStudentCode(dateOfBirth);

    const student = await prisma.student.create({
      data: {
        studentCode,
        name,
        dateOfBirth:   new Date(dateOfBirth),
        sectionId:     Number(sectionId),
        guardianId:    guardianId ? Number(guardianId) : null,
        status:        status || "ACTIVE",
        guardianName:  guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
      },
      include: { section: { include: { gradeLevel: true } } },
    });

    // Auto-create student login account
    const studentAccount = await createStudentAccount(student);

    // Find existing parent account by phone, or create a new one
    const parentAccount = await findOrCreateParentAccount(guardianName, guardianPhone, student);

    res.status(201).json({ ...student, account: studentAccount, parentAccount });
  } catch (err) {
    console.error("createStudent error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Student code already exists — please try again" });
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

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Delete related records first
    await prisma.attendance.deleteMany({ where: { studentId: id } });
    await prisma.gradeRecord.deleteMany({ where: { studentId: id } });

    // Delete fee payments before invoices
    const invoices = await prisma.feeInvoice.findMany({ where: { studentId: id }, select: { id: true } });
    for (const inv of invoices) {
      await prisma.payment.deleteMany({ where: { invoiceId: inv.id } });
    }
    await prisma.feeInvoice.deleteMany({ where: { studentId: id } });

    // Delete the student record itself
    await prisma.student.delete({ where: { id } });

    // Delete the student login account if it exists
    if (student.userId) {
      await prisma.user.delete({ where: { id: student.userId } }).catch(() => {});
    }

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

        // Auto-create a STUDENT login account for this student
        const account = await createStudentAccount(created);

        // Auto-create (or link to an existing) PARENT account, same as
        // the single Add Student flow — only when guardian info was provided.
        let parentAccount = null;
        if (row.guardianName && row.guardianPhone) {
          parentAccount = await findOrCreateParentAccount(
            String(row.guardianName).trim(),
            String(row.guardianPhone).trim(),
            created
          );
        }

        results.push({ row: rowNum, status: "created", student: created, account, parentAccount });
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

// GET /api/students/:id/account
// Admin: returns the student's login email (if an account exists)
async function getStudentAccount(req, res) {
  try {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (!student.user) {
      return res.json({ exists: false });
    }
    res.json({ exists: true, email: student.user.email, isActive: student.user.isActive, userId: student.user.id });
  } catch (err) {
    console.error("getStudentAccount error:", err);
    res.status(500).json({ error: "Failed to fetch student account" });
  }
}

// POST /api/students/:id/account
// Admin: create a login account for this student if one doesn't exist yet
async function createAccountForStudent(req, res) {
  try {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (student.userId) {
      return res.status(409).json({ error: "This student already has a login account" });
    }

    const account = await createStudentAccount(student);
    if (!account) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    res.status(201).json(account);
  } catch (err) {
    console.error("createAccountForStudent error:", err);
    res.status(500).json({ error: "Failed to create student account" });
  }
}

// POST /api/students/:id/account/reset-password
// Admin: generate a new password for this student's account
async function resetStudentPassword(req, res) {
  try {
    const id = Number(req.params.id);
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: "Student not found" });
    if (!student.userId) return res.status(404).json({ error: "This student has no login account yet" });

    const plainPassword = generateStudentPassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { id: student.userId },
      data: { password: hashed },
    });

    res.json({ password: plainPassword });
  } catch (err) {
    console.error("resetStudentPassword error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  createStudentAccount,
  studentEmailFromCode,
  getStudentAccount,
  createAccountForStudent,
  resetStudentPassword,
};
