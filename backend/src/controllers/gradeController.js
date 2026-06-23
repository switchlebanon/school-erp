const prisma = require("../config/db");

// Standard term names offered in the UI
const TERMS = ["Term 1", "Term 2", "Term 3", "Final"];

// GET /api/grades/terms
// Returns the list of available term names
async function getTerms(req, res) {
  res.json(TERMS);
}

// GET /api/grades?sectionId=&subjectId=&term=
// Returns every student in the section with their grade for this subject/term (if any)
async function getGradesForClass(req, res) {
  try {
    const { sectionId, subjectId, term } = req.query;

    if (!sectionId || !subjectId || !term) {
      return res.status(400).json({ error: "sectionId, subjectId and term are required" });
    }

    const students = await prisma.student.findMany({
      where: { sectionId: Number(sectionId), status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, studentCode: true, name: true },
    });

    const records = await prisma.gradeRecord.findMany({
      where: {
        subjectId: Number(subjectId),
        term: String(term),
        studentId: { in: students.map(s => s.id) },
      },
    });
    const recordMap = new Map(records.map(r => [r.studentId, r]));

    const result = students.map(s => {
      const rec = recordMap.get(s.id);
      return {
        studentId:   s.id,
        studentCode: s.studentCode,
        name:        s.name,
        gradeRecordId: rec?.id || null,
        score:       rec ? Number(rec.score) : null,
        maxScore:    rec ? Number(rec.maxScore) : 100,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getGradesForClass error:", err);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
}

// POST /api/grades/bulk
// Body: { subjectId, term, grades: [{ studentId, score, maxScore }] }
// Upserts a grade record per student (create or update).
async function saveGradesBulk(req, res) {
  try {
    const { subjectId, term, grades } = req.body;

    if (!subjectId || !term || !Array.isArray(grades)) {
      return res.status(400).json({ error: "subjectId, term and grades[] are required" });
    }

    const results = [];

    for (const g of grades) {
      const { studentId, score, maxScore } = g;

      if (studentId == null) continue;

      // Skip rows where score is empty/null -> delete existing record if any
      if (score === null || score === "" || score === undefined) {
        await prisma.gradeRecord.deleteMany({
          where: { studentId: Number(studentId), subjectId: Number(subjectId), term: String(term) },
        });
        results.push({ studentId, status: "cleared" });
        continue;
      }

      const numScore = Number(score);
      const numMax   = maxScore != null && maxScore !== "" ? Number(maxScore) : 100;

      if (isNaN(numScore) || numScore < 0 || numScore > 100) {
        results.push({ studentId, status: "error", error: "Score must be between 0 and 100" });
        continue;
      }

      const record = await prisma.gradeRecord.upsert({
        where: {
          studentId_subjectId_term: {
            studentId: Number(studentId),
            subjectId: Number(subjectId),
            term: String(term),
          },
        },
        update: { score: numScore, maxScore: numMax },
        create: {
          studentId: Number(studentId),
          subjectId: Number(subjectId),
          term: String(term),
          score: numScore,
          maxScore: numMax,
        },
      });

      results.push({ studentId, status: "saved", id: record.id });
    }

    const summary = {
      saved:   results.filter(r => r.status === "saved").length,
      cleared: results.filter(r => r.status === "cleared").length,
      errors:  results.filter(r => r.status === "error").length,
    };

    res.json({ summary, results });
  } catch (err) {
    console.error("saveGradesBulk error:", err);
    res.status(500).json({ error: "Failed to save grades" });
  }
}

// GET /api/grades/student/:studentId
// Returns all grade records for a student, across subjects/terms.
// PARENT/STUDENT can only view their own linked student's grades.
async function getStudentGrades(req, res) {
  try {
    const studentId = Number(req.params.studentId);

    if (req.user.role === "PARENT" || req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.guardianId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this student's grades" });
      }
    }

    const records = await prisma.gradeRecord.findMany({
      where: { studentId },
      include: { subject: true },
      orderBy: [{ term: "asc" }, { subject: { name: "asc" } }],
    });

    const formatted = records.map(r => ({
      id:       r.id,
      subject:  r.subject.name,
      term:     r.term,
      score:    Number(r.score),
      maxScore: Number(r.maxScore),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getStudentGrades error:", err);
    res.status(500).json({ error: "Failed to fetch student grades" });
  }
}

// GET /api/grades/class-summary?sectionId=&term=
// Returns the class average per subject for a section/term (for charts)
async function getClassSummary(req, res) {
  try {
    const { sectionId, term } = req.query;
    if (!sectionId || !term) {
      return res.status(400).json({ error: "sectionId and term are required" });
    }

    const students = await prisma.student.findMany({
      where: { sectionId: Number(sectionId) },
      select: { id: true },
    });
    const studentIds = students.map(s => s.id);

    const records = await prisma.gradeRecord.findMany({
      where: { studentId: { in: studentIds }, term: String(term) },
      include: { subject: true },
    });

    const bySubject = {};
    records.forEach(r => {
      const pct = (Number(r.score) / Number(r.maxScore)) * 100;
      if (!bySubject[r.subject.name]) bySubject[r.subject.name] = [];
      bySubject[r.subject.name].push(pct);
    });

    const summary = Object.entries(bySubject).map(([subject, scores]) => ({
      subject,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }));

    res.json(summary);
  } catch (err) {
    console.error("getClassSummary error:", err);
    res.status(500).json({ error: "Failed to fetch class summary" });
  }
}

module.exports = {
  getTerms,
  getGradesForClass,
  saveGradesBulk,
  getStudentGrades,
  getClassSummary,
};
