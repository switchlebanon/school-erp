const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

const teacherInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
  subjects: { include: { subject: true } },
};

// GET /api/teachers
// Optional query: ?search=&status=
async function getTeachers(req, res) {
  try {
    const { search, status } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.user = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: teacherInclude,
      orderBy: { user: { name: "asc" } },
    });

    res.json(teachers);
  } catch (err) {
    console.error("getTeachers error:", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
}

// GET /api/teachers/:id
async function getTeacherById(req, res) {
  try {
    const id = Number(req.params.id);
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: teacherInclude,
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (err) {
    console.error("getTeacherById error:", err);
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
}

// POST /api/teachers
// Body: { name, email, phone?, status?, subjectIds?: number[] }
// Creates a TEACHER user account (with a generated password) and the Teacher record.
async function createTeacher(req, res) {
  try {
    const { name, email, phone, status, subjectIds } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const plainPassword = generatePassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashed,
        role: "TEACHER",
        phone: phone ? String(phone).trim() : null,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        status: status || "ACTIVE",
        ...(Array.isArray(subjectIds) && subjectIds.length > 0 && {
          subjects: {
            create: subjectIds.map(sid => ({ subjectId: Number(sid) })),
          },
        }),
      },
      include: teacherInclude,
    });

    res.status(201).json({ ...teacher, account: { email: user.email, password: plainPassword } });
  } catch (err) {
    console.error("createTeacher error:", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
}

// PUT /api/teachers/:id
// Body: { name?, phone?, status?, subjectIds?: number[] }
// Updates the linked user's name/phone, the teacher's status, and replaces subject assignments.
async function updateTeacher(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, phone, status, subjectIds } = req.body;

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Update linked user fields
    if (name !== undefined || phone !== undefined) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: {
          ...(name !== undefined && { name: String(name).trim() }),
          ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        },
      });
    }

    // Update status
    if (status !== undefined) {
      await prisma.teacher.update({ where: { id }, data: { status } });
    }

    // Replace subject assignments
    if (Array.isArray(subjectIds)) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: id } });
      if (subjectIds.length > 0) {
        await prisma.teacherSubject.createMany({
          data: subjectIds.map(sid => ({ teacherId: id, subjectId: Number(sid) })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.teacher.findUnique({ where: { id }, include: teacherInclude });
    res.json(updated);
  } catch (err) {
    console.error("updateTeacher error:", err);
    res.status(500).json({ error: "Failed to update teacher" });
  }
}

// DELETE /api/teachers/:id
// Deletes the Teacher record and their user account.
async function deleteTeacher(req, res) {
  try {
    const id = Number(req.params.id);
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    await prisma.teacherSubject.deleteMany({ where: { teacherId: id } });
    await prisma.teacher.delete({ where: { id } });
    await prisma.user.delete({ where: { id: teacher.userId } });

    res.status(204).send();
  } catch (err) {
    console.error("deleteTeacher error:", err);
    res.status(500).json({ error: "Failed to delete teacher" });
  }
}

// POST /api/teachers/:id/reset-password
async function resetTeacherPassword(req, res) {
  try {
    const id = Number(req.params.id);
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const plainPassword = generatePassword();
    const hashed = await bcrypt.hash(plainPassword, 10);
    await prisma.user.update({ where: { id: teacher.userId }, data: { password: hashed } });

    res.json({ password: plainPassword });
  } catch (err) {
    console.error("resetTeacherPassword error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
};
