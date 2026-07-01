// backend/routes/grades.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth    = authenticate;
const requireAdmin   = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));
const requireTeacher = (req, res, next) => authenticate(req, res, () => authorize('TEACHER', 'ADMIN')(req, res, next));

// ─── GPA Helpers ───────────────────────────────────────────
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

function scoreToLetter(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// GET /api/grades?termId=&studentId=&classId=
router.get('/', requireAuth, async (req, res) => {
  const { termId, studentId, classId } = req.query;
  try {
    const where = {};
    if (termId) where.termId = termId;
    if (studentId) where.studentId = studentId;
    if (classId) where.student = { classId };

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
        subject: true,
        term: true,
      },
      orderBy: [{ student: { lastName: 'asc' } }, { subject: { name: 'asc' } }],
    });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades — upsert a grade
router.post('/', requireTeacher, async (req, res) => {
  const { studentId, subjectId, termId, score, comment } = req.body;
  if (!studentId || !subjectId || !termId || score === undefined) {
    return res.status(400).json({ error: 'studentId, subjectId, termId, score are required.' });
  }
  if (score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be 0–100.' });
  }

  const letterGrade = scoreToLetter(score);
  const teacherId = req.user.teacherId || null;

  try {
    const grade = await prisma.grade.upsert({
      where: { studentId_subjectId_termId: { studentId, subjectId, termId } },
      update: { score, letterGrade, comment, teacherId },
      create: { studentId, subjectId, termId, score, letterGrade, comment, teacherId },
      include: { student: true, subject: true },
    });
    res.json(grade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades/bulk — bulk upsert array of grades
router.post('/bulk', requireTeacher, async (req, res) => {
  const { grades } = req.body; // [{studentId, subjectId, termId, score, comment}]
  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ error: 'grades array is required.' });
  }
  const teacherId = req.user.teacherId || null;
  try {
    const results = await Promise.all(
      grades.map((g) =>
        prisma.grade.upsert({
          where: { studentId_subjectId_termId: { studentId: g.studentId, subjectId: g.subjectId, termId: g.termId } },
          update: { score: g.score, letterGrade: scoreToLetter(g.score), comment: g.comment, teacherId },
          create: {
            studentId: g.studentId,
            subjectId: g.subjectId,
            termId: g.termId,
            score: g.score,
            letterGrade: scoreToLetter(g.score),
            comment: g.comment,
            teacherId,
          },
        })
      )
    );
    res.json({ saved: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/gpa?termId=&classId= — GPA + ranking for a class/term
router.get('/gpa', requireAuth, async (req, res) => {
  const { termId, classId } = req.query;
  if (!termId || !classId) return res.status(400).json({ error: 'termId and classId are required.' });

  try {
    // Fetch all students in class
    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true, firstName: true, lastName: true, studentId: true },
    });

    const studentIds = students.map((s) => s.id);

    const allGrades = await prisma.grade.findMany({
      where: { termId, studentId: { in: studentIds } },
      include: { subject: true },
    });

    // Group by student
    const studentGrades = {};
    for (const s of students) {
      studentGrades[s.id] = { student: s, grades: [] };
    }
    for (const g of allGrades) {
      if (studentGrades[g.studentId]) {
        studentGrades[g.studentId].grades.push(g);
      }
    }

    // Compute GPA per student
    const results = Object.values(studentGrades).map(({ student, grades }) => {
      const average = grades.length
        ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
        : null;
      const gpa = average !== null ? scoreToGradePoint(average) : null;
      return {
        student,
        grades,
        average: average !== null ? Math.round(average * 100) / 100 : null,
        gpa: gpa !== null ? Math.round(gpa * 100) / 100 : null,
        letterGrade: average !== null ? scoreToLetter(average) : null,
      };
    });

    // Rank — sort by average desc, assign rank (ties share rank)
    const ranked = results
      .filter((r) => r.average !== null)
      .sort((a, b) => b.average - a.average);

    let rank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].average < ranked[i - 1].average) rank = i + 1;
      ranked[i].rank = rank;
    }

    // Students with no grades get no rank
    const noGrades = results.filter((r) => r.average === null).map((r) => ({ ...r, rank: null }));

    res.json([...ranked, ...noGrades]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/student/:studentId/report?termId=
router.get('/student/:studentId/report', requireAuth, async (req, res) => {
  const { studentId } = req.params;
  const { termId } = req.query;
  if (!termId) return res.status(400).json({ error: 'termId is required.' });

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        parent: { select: { name: true, phone: true } },
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    const grades = await prisma.grade.findMany({
      where: { studentId, termId },
      include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
      orderBy: { subject: { name: 'asc' } },
    });

    // Attendance for the term
    const attendances = await prisma.attendance.findMany({ where: { studentId, termId } });
    const totalDays = attendances.length;
    const presentDays = attendances.filter((a) => a.status === 'PRESENT').length;
    const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;
    const lateDays = attendances.filter((a) => a.status === 'LATE').length;

    const average = grades.length
      ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
      : null;
    const gpa = average !== null ? scoreToGradePoint(average) : null;

    // Class ranking
    const classStudents = await prisma.student.findMany({
      where: { classId: student.classId },
      select: { id: true },
    });
    const classIds = classStudents.map((s) => s.id);
    const classGrades = await prisma.grade.findMany({
      where: { termId, studentId: { in: classIds } },
    });
    const studentAverages = {};
    for (const g of classGrades) {
      if (!studentAverages[g.studentId]) studentAverages[g.studentId] = [];
      studentAverages[g.studentId].push(g.score);
    }
    const sortedAverages = Object.values(studentAverages)
      .map((scores) => scores.reduce((a, b) => a + b, 0) / scores.length)
      .sort((a, b) => b - a);
    const myAvg = average;
    let classRank = null;
    if (myAvg !== null) {
      classRank = sortedAverages.findIndex((a) => a <= myAvg) + 1;
    }

    res.json({
      student,
      term,
      grades,
      attendance: { totalDays, presentDays, absentDays, lateDays },
      summary: {
        average: average !== null ? Math.round(average * 100) / 100 : null,
        gpa: gpa !== null ? Math.round(gpa * 100) / 100 : null,
        letterGrade: average !== null ? scoreToLetter(average) : null,
        classRank,
        classSize: classStudents.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
