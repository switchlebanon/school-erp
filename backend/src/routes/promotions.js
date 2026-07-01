// backend/routes/promotions.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth  = authenticate;
const requireAdmin = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));

// GET /api/promotions?academicYearId=
router.get('/', requireAdmin, async (req, res) => {
  const { academicYearId } = req.query;
  try {
    const promotions = await prisma.studentPromotion.findMany({
      where: academicYearId ? { academicYearId } : {},
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
        academicYear: true,
      },
      orderBy: { promotedAt: 'desc' },
    });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promotions/promote-class — promote entire class
// Body: { classId, academicYearId, toClassId?, status?, notes? }
router.post('/promote-class', requireAdmin, async (req, res) => {
  const { classId, academicYearId, toClassId, status = 'PROMOTED', notes } = req.body;
  if (!classId || !academicYearId) {
    return res.status(400).json({ error: 'classId and academicYearId are required.' });
  }

  try {
    const fromClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!fromClass) return res.status(404).json({ error: 'Class not found.' });

    const toClass = toClassId ? await prisma.class.findUnique({ where: { id: toClassId } }) : null;

    // Check academic year exists
    const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!academicYear) return res.status(404).json({ error: 'Academic year not found.' });

    // Get all active students in the class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
    });

    if (students.length === 0) {
      return res.status(400).json({ error: 'No active students found in this class.' });
    }

    // Create promotion records + optionally move students to new class
    const promotionData = students.map((s) => ({
      studentId: s.id,
      academicYearId,
      fromGradeLevel: fromClass.gradeLevel || fromClass.name,
      toGradeLevel: toClass ? toClass.gradeLevel || toClass.name : 'Unassigned',
      fromClassId: classId,
      toClassId: toClassId || null,
      promotedBy: req.user?.id || null,
      status,
      notes: notes || null,
    }));

    const result = await prisma.$transaction(async (tx) => {
      // Insert promotion records
      await tx.studentPromotion.createMany({ data: promotionData, skipDuplicates: true });

      // If toClassId provided, move students
      if (toClassId) {
        await tx.student.updateMany({
          where: { id: { in: students.map((s) => s.id) } },
          data: { classId: toClassId },
        });
      }

      return { count: students.length };
    });

    res.json({
      message: `Successfully promoted ${result.count} students from ${fromClass.name}.`,
      count: result.count,
      toClass: toClass?.name || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promotions/promote-student — promote individual student
router.post('/promote-student', requireAdmin, async (req, res) => {
  const { studentId, academicYearId, toClassId, status = 'PROMOTED', notes } = req.body;
  if (!studentId || !academicYearId) {
    return res.status(400).json({ error: 'studentId and academicYearId are required.' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const toClass = toClassId ? await prisma.class.findUnique({ where: { id: toClassId } }) : null;

    const promotion = await prisma.$transaction(async (tx) => {
      const promo = await tx.studentPromotion.create({
        data: {
          studentId,
          academicYearId,
          fromGradeLevel: student.class?.gradeLevel || student.class?.name || 'Unknown',
          toGradeLevel: toClass?.gradeLevel || toClass?.name || 'Unassigned',
          fromClassId: student.classId,
          toClassId: toClassId || null,
          promotedBy: req.user?.id || null,
          status,
          notes: notes || null,
        },
      });
      if (toClassId) {
        await tx.student.update({ where: { id: studentId }, data: { classId: toClassId } });
      }
      return promo;
    });

    res.json(promotion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/promotions/preview/:classId — preview who will be promoted
router.get('/preview/:classId', requireAdmin, async (req, res) => {
  const { classId } = req.params;
  const { termId } = req.query;
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, studentId: true },
    });

    let withGrades = students.map((s) => ({ ...s, average: null, gpa: null, passStatus: 'NO_GRADES' }));

    if (termId) {
      const grades = await prisma.grade.findMany({
        where: { termId, studentId: { in: students.map((s) => s.id) } },
      });
      const map = {};
      for (const g of grades) {
        if (!map[g.studentId]) map[g.studentId] = [];
        map[g.studentId].push(g.score);
      }
      withGrades = students.map((s) => {
        const scores = map[s.id] || [];
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        return {
          ...s,
          average: avg !== null ? Math.round(avg * 100) / 100 : null,
          gpa: avg !== null ? scoreToGradePoint(avg) : null,
          passStatus: avg === null ? 'NO_GRADES' : avg >= 50 ? 'PASS' : 'FAIL',
        };
      });
    }

    res.json({ classId, students: withGrades, count: students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function scoreToGradePoint(score) {
  if (score >= 90) return 4.0;
  if (score >= 85) return 3.7;
  if (score >= 80) return 3.3;
  if (score >= 75) return 3.0;
  if (score >= 70) return 2.7;
  if (score >= 65) return 2.3;
  if (score >= 60) return 2.0;
  if (score >= 55) return 1.7;
  if (score >= 50) return 1.0;
  return 0.0;
}

module.exports = router;
