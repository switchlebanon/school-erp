// backend/routes/academicYears.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth  = authenticate;
const requireAdmin = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));

// GET /api/academic-years — list all
router.get('/', requireAuth, async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic-years/current
router.get('/current', requireAuth, async (req, res) => {
  try {
    const year = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });
    if (!year) return res.status(404).json({ error: 'No current academic year set.' });
    res.json(year);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic-years — create
router.post('/', requireAdmin, async (req, res) => {
  const { name, startDate, endDate, terms } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, startDate, endDate are required.' });
  }
  try {
    const year = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        terms: terms?.length
          ? {
              create: terms.map((t) => ({
                name: t.name,
                startDate: new Date(t.startDate),
                endDate: new Date(t.endDate),
              })),
            }
          : undefined,
      },
      include: { terms: true },
    });
    res.status(201).json(year);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Academic year name already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic-years/:id/set-current — mark as current (clears others)
router.put('/:id/set-current', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction([
      prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id }, data: { isCurrent: true, isClosed: false } }),
    ]);
    const updated = await prisma.academicYear.findUnique({ where: { id }, include: { terms: true } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic-years/:id/close — close the year
router.put('/:id/close', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const year = await prisma.academicYear.update({
      where: { id },
      data: { isClosed: true, isCurrent: false },
    });
    res.json(year);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/academic-years/:id — only if no associated data
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const hasGrades = await prisma.grade.findFirst({ where: { term: { academicYearId: id } } });
    if (hasGrades) return res.status(409).json({ error: 'Cannot delete year with existing grades.' });
    await prisma.term.deleteMany({ where: { academicYearId: id } });
    await prisma.academicYear.delete({ where: { id } });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic-years/:id/terms — add a term to existing year
router.post('/:id/terms', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate } = req.body;
  try {
    const term = await prisma.term.create({
      data: { name, startDate: new Date(startDate), endDate: new Date(endDate), academicYearId: id },
    });
    res.status(201).json(term);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Term name already exists in this year.' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
