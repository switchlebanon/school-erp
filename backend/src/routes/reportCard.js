// ============================================================
// backend/routes/reportCard.js
// PDF report card generation using pdfkit
// Install: npm install pdfkit
// ============================================================
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth  = authenticate;
const requireAdmin = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));
const requireTeacher = (req, res, next) => authenticate(req, res, () => authorize('TEACHER', 'ADMIN')(req, res, next));

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

// GET /api/report-card/:studentId/pdf?termId=
router.get('/:studentId/pdf', requireAuth, async (req, res) => {
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
    if (!term) return res.status(404).json({ error: 'Term not found.' });

    const grades = await prisma.grade.findMany({
      where: { studentId, termId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    const attendances = await prisma.attendance.findMany({ where: { studentId, termId } });
    const totalDays = attendances.length;
    const presentDays = attendances.filter((a) => a.status === 'PRESENT').length;
    const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;
    const lateDays = attendances.filter((a) => a.status === 'LATE').length;

    const average = grades.length
      ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
      : null;
    const gpa = average !== null ? scoreToGradePoint(average) : null;

    // Class rank
    const classStudents = await prisma.student.findMany({
      where: { classId: student.classId },
      select: { id: true },
    });
    const classIds = classStudents.map((s) => s.id);
    const classGradesAll = await prisma.grade.findMany({
      where: { termId, studentId: { in: classIds } },
    });
    const avgMap = {};
    for (const g of classGradesAll) {
      if (!avgMap[g.studentId]) avgMap[g.studentId] = [];
      avgMap[g.studentId].push(g.score);
    }
    const sortedAvgs = Object.values(avgMap)
      .map((sc) => sc.reduce((a, b) => a + b, 0) / sc.length)
      .sort((a, b) => b - a);
    let classRank = null;
    if (average !== null) {
      classRank = sortedAvgs.findIndex((a) => a <= average) + 1;
    }

    // ── Build PDF ─────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="report-card-${student.studentId}-${term.name.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    const BRAND = '#1E3A5F';    // deep navy — S³ brand color
    const ACCENT = '#F59E0B';   // amber
    const LIGHT = '#F8FAFC';
    const TEXT = '#1E293B';

    // ── Header band ──
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND);

    // School name / logo area
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22)
      .text('S³ School Management System', 50, 22);
    doc.fillColor(ACCENT).font('Helvetica').fontSize(11)
      .text('Student Report Card', 50, 50);
    doc.fillColor('#CBD5E1').fontSize(10)
      .text(`${term.name}  ·  ${term.academicYear.name}`, 50, 68);

    // ── Student info block ──
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(13).text(
      `${student.firstName} ${student.lastName}`,
      50, 110
    );
    doc.font('Helvetica').fontSize(10).fillColor('#64748B')
      .text(`Student ID: ${student.studentId}`, 50, 128)
      .text(`Class: ${student.class?.name || '—'}`, 50, 143)
      .text(`Guardian: ${student.parent?.name || '—'}`, 50, 158);

    // Right side summary box
    const boxX = 360;
    doc.roundedRect(boxX, 100, 185, 80, 6).fill(LIGHT).stroke('#E2E8F0');
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(10).text('Term Summary', boxX + 12, 112);
    doc.font('Helvetica').fontSize(10)
      .text(`Average: ${average !== null ? average.toFixed(1) + '%' : '—'}`, boxX + 12, 130)
      .text(`GPA: ${gpa !== null ? gpa.toFixed(2) : '—'}`, boxX + 12, 146)
      .text(
        `Rank: ${classRank !== null ? `${classRank} of ${classStudents.length}` : '—'}`,
        boxX + 12, 162
      );

    // ── Grades table ──
    const tableTop = 210;
    const colWidths = [180, 60, 60, 60, 120];
    const cols = [50, 230, 290, 350, 410];
    const headers = ['Subject', 'Score', 'Letter', 'GPA Pts', 'Teacher Comment'];

    // Table header
    doc.rect(50, tableTop - 2, 495, 20).fill(BRAND);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    headers.forEach((h, i) => doc.text(h, cols[i], tableTop + 3, { width: colWidths[i] }));

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    grades.forEach((g, idx) => {
      const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(50, y - 2, 495, 18).fill(bg);
      doc.fillColor(TEXT)
        .text(g.subject.name, cols[0], y, { width: colWidths[0] })
        .text(g.score.toFixed(1), cols[1], y, { width: colWidths[1] })
        .text(g.letterGrade || scoreToLetter(g.score), cols[2], y, { width: colWidths[2] })
        .text(scoreToGradePoint(g.score).toFixed(1), cols[3], y, { width: colWidths[3] })
        .text(g.comment || '', cols[4], y, { width: colWidths[4] });
      y += 18;
    });

    if (grades.length === 0) {
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(10)
        .text('No grades recorded for this term.', 50, y + 10);
      y += 30;
    }

    // ── Attendance ──
    y += 20;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(11).text('Attendance', 50, y);
    y += 16;

    const attCols = [50, 170, 290, 410];
    const attLabels = ['Total Days', 'Present', 'Absent', 'Late'];
    const attValues = [totalDays, presentDays, absentDays, lateDays];

    doc.rect(50, y - 2, 495, 18).fill(LIGHT);
    attLabels.forEach((lbl, i) => {
      doc.fillColor('#64748B').font('Helvetica').fontSize(9).text(lbl, attCols[i], y + 1);
    });
    y += 18;
    attValues.forEach((val, i) => {
      doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(12).text(String(val), attCols[i], y);
    });
    y += 24;

    const attendancePct = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '—';
    doc.fillColor('#64748B').font('Helvetica').fontSize(9)
      .text(`Attendance rate: ${attendancePct}%`, 50, y);

    // ── Overall grade band ──
    y += 30;
    const overallColor = average >= 75 ? '#16A34A' : average >= 50 ? ACCENT : '#DC2626';
    doc.rect(50, y, 495, 36).fill(overallColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14)
      .text(
        `Overall: ${average !== null ? average.toFixed(1) + '% — ' + scoreToLetter(average) : 'No Grades'}`,
        60, y + 10
      );

    // ── Footer ──
    const footY = doc.page.height - 60;
    doc.moveTo(50, footY).lineTo(545, footY).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
      .text(
        `Generated by S³ ERP on ${new Date().toLocaleDateString('en-GB')}  ·  Confidential`,
        50, footY + 10
      )
      .text('This document is computer-generated and does not require a signature.', 50, footY + 22);

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;


// ============================================================
// ADD TO backend/index.js (or app.js) — register all new routes
// ============================================================
/*
const academicYearsRouter  = require('./routes/academicYears');
const gradesRouter         = require('./routes/grades');
const promotionsRouter     = require('./routes/promotions');
const messagesRouter       = require('./routes/messages');
const reportCardRouter     = require('./routes/reportCard');

app.use('/api/academic-years', academicYearsRouter);
app.use('/api/grades',         gradesRouter);
app.use('/api/promotions',     promotionsRouter);
app.use('/api/messages',       messagesRouter);
app.use('/api/report-card',    reportCardRouter);
*/
