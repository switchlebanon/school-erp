// backend/src/routes/timetableAuto.js
// ================================================================
// Auto-Timetable API Routes
// ================================================================
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const { schedule } = require('../engine/scheduler');

const requireAuth  = authenticate;
const requireAdmin = (req, res, next) => authenticate(req, res, () => authorize('ADMIN')(req, res, next));

// ─── Timetable Configs ───────────────────────────────────────

// GET /api/timetable-auto/configs
router.get('/configs', requireAuth, async (req, res) => {
  try {
    const configs = await prisma.timetableConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { slots: true } } },
    });
    res.json(configs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timetable-auto/configs
router.post('/configs', requireAdmin, async (req, res) => {
  const { name, periodsPerDay = 7, daysPerWeek = 5, startTime = '07:30', breakAfterPeriod, academicYearId } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });
  try {
    const config = await prisma.timetableConfig.create({
      data: { name, periodsPerDay, daysPerWeek, startTime, breakAfterPeriod, academicYearId },
    });
    res.status(201).json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/timetable-auto/configs/:id
router.delete('/configs/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.timetableSlot.deleteMany({ where: { configId: req.params.id } });
    await prisma.teacherConstraint.deleteMany({ where: { configId: req.params.id } });
    await prisma.timetableConfig.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Assignments ─────────────────────────────────────────────
// Assignments = which teacher teaches which subject to which section, how many periods/week
// These are stored separately and passed to the scheduler

// GET /api/timetable-auto/setup — fetch all data needed for setup page
router.get('/setup', requireAuth, async (req, res) => {
  try {
    const [teachers, sections, subjects] = await Promise.all([
      prisma.teacher.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { name: true } },
          subjects: { include: { subject: true } },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.section.findMany({
        include: { gradeLevel: true },
        orderBy: [{ gradeLevel: { order: 'asc' } }, { name: 'asc' }],
      }),
      prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    ]);
    res.json({ teachers, sections, subjects });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Constraints ─────────────────────────────────────────────

// GET /api/timetable-auto/configs/:id/constraints
router.get('/configs/:id/constraints', requireAuth, async (req, res) => {
  try {
    const constraints = await prisma.teacherConstraint.findMany({
      where: { configId: req.params.id },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    res.json(constraints);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timetable-auto/configs/:id/constraints
router.post('/configs/:id/constraints', requireAdmin, async (req, res) => {
  const { teacherId, type, day, period, note } = req.body;
  if (!teacherId || !type) return res.status(400).json({ error: 'teacherId and type are required.' });
  try {
    const constraint = await prisma.teacherConstraint.create({
      data: {
        configId: req.params.id,
        teacherId: parseInt(teacherId),
        type,
        day: day !== undefined ? parseInt(day) : null,
        period: period !== undefined ? parseInt(period) : null,
        note,
      },
    });
    res.status(201).json(constraint);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/timetable-auto/configs/:id/constraints/:cid
router.delete('/configs/:id/constraints/:cid', requireAdmin, async (req, res) => {
  try {
    await prisma.teacherConstraint.delete({ where: { id: req.params.cid } });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Generate ────────────────────────────────────────────────

// POST /api/timetable-auto/configs/:id/generate
// Body: { assignments: [{teacherId, subjectId, sectionId, periodsPerWeek}] }
router.post('/configs/:id/generate', requireAdmin, async (req, res) => {
  const { assignments } = req.body;
  if (!assignments?.length) return res.status(400).json({ error: 'assignments are required.' });

  try {
    const config = await prisma.timetableConfig.findUnique({ where: { id: req.params.id } });
    if (!config) return res.status(404).json({ error: 'Config not found.' });

    // Load teachers and sections
    const teacherIds = [...new Set(assignments.map(a => parseInt(a.teacherId)))];
    const sectionIds = [...new Set(assignments.map(a => parseInt(a.sectionId)))];

    const [teachers, sections, constraints] = await Promise.all([
      prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        include: { user: { select: { name: true } } },
      }),
      prisma.section.findMany({ where: { id: { in: sectionIds } } }),
      prisma.teacherConstraint.findMany({ where: { configId: config.id } }),
    ]);

    const teacherInput = teachers.map(t => ({
      id: t.id,
      name: t.user.name,
      maxHoursPerWeek: t.maxHoursPerWeek || 999,
    }));

    const sectionInput = sections.map(s => ({ id: s.id, name: s.name }));

    const assignmentInput = assignments.map(a => ({
      teacherId: parseInt(a.teacherId),
      subjectId: parseInt(a.subjectId),
      sectionId: parseInt(a.sectionId),
      periodsPerWeek: parseInt(a.periodsPerWeek),
    }));

    const constraintInput = constraints.map(c => ({
      teacherId: c.teacherId,
      type: c.type,
      day: c.day,
      period: c.period,
    }));

    // Run the scheduler
    const classConfigsInput = {};
if (req.body.classConfigs) {
  for (const [sid, cfg] of Object.entries(req.body.classConfigs)) {
    classConfigsInput[parseInt(sid)] = {
      periodsPerDay: cfg.periodsPerDay || config.periodsPerDay,
      sessionDuration: cfg.sessionDuration || config.periodDuration,
      breakAfterPeriods: Array.isArray(cfg.breakAfterPeriods) ? cfg.breakAfterPeriods : [],
      breakDurations: Array.isArray(cfg.breakDurations) ? cfg.breakDurations : [15],
    };
  }
}

const result = schedule({
  sections: sectionInput,
  teachers: teacherInput,
  assignments: assignmentInput,
  constraints: constraintInput,
  periodsPerDay: config.periodsPerDay,
  classConfigs: classConfigsInput,
});

    if (result.slots.length === 0) {
      return res.status(422).json({
        error: 'Scheduler could not place any slots. Check your assignments and constraints.',
        conflicts: result.conflicts,
      });
    }

    // Clear existing slots for this config (non-locked)
    await prisma.timetableSlot.deleteMany({
      where: { configId: config.id, isLocked: false },
    });

    // Save new slots
    const saved = await prisma.timetableSlot.createMany({
      data: result.slots.map(s => ({
        configId: config.id,
        sectionId: s.sectionId,
        subjectId: s.subjectId,
        teacherId: s.teacherId,
        day: s.day,
        period: s.period,
      })),
      skipDuplicates: true,
    });

    res.json({
      message: `Generated ${saved.count} slots.`,
      placed: result.slots.length,
      conflicts: result.conflicts,
      stats: result.stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Slots ───────────────────────────────────────────────

// GET /api/timetable-auto/configs/:id/slots?sectionId=&teacherId=
router.get('/configs/:id/slots', requireAuth, async (req, res) => {
  const { sectionId, teacherId } = req.query;
  try {
    const where = { configId: req.params.id };
    if (sectionId) where.sectionId = parseInt(sectionId);
    if (teacherId) where.teacherId = parseInt(teacherId);

    const slots = await prisma.timetableSlot.findMany({
      where,
      include: {
        subject: true,
        teacher: { include: { user: { select: { name: true } } } },
        section: { include: { gradeLevel: true } },
      },
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
    });
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/timetable-auto/slots/:slotId — move a slot (drag-and-drop)
router.patch('/slots/:slotId', requireAdmin, async (req, res) => {
  const { day, period } = req.body;
  const slotId = req.params.slotId;

  try {
    const slot = await prisma.timetableSlot.findUnique({ where: { id: slotId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (slot.isLocked) return res.status(409).json({ error: 'Slot is locked.' });

    // Check conflicts at new position
    const teacherConflict = await prisma.timetableSlot.findFirst({
      where: { configId: slot.configId, teacherId: slot.teacherId, day, period, id: { not: slotId } },
    });
    if (teacherConflict) return res.status(409).json({ error: 'Teacher already has a class at this time.' });

    const sectionConflict = await prisma.timetableSlot.findFirst({
      where: { configId: slot.configId, sectionId: slot.sectionId, day, period, id: { not: slotId } },
    });
    if (sectionConflict) return res.status(409).json({ error: 'Section already has a class at this time.' });

    const updated = await prisma.timetableSlot.update({
      where: { id: slotId },
      data: { day, period },
      include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/timetable-auto/slots/:slotId/swap — swap two slots
router.patch('/slots/:slotId/swap', requireAdmin, async (req, res) => {
  const { targetSlotId } = req.body;
  try {
    const [a, b] = await Promise.all([
      prisma.timetableSlot.findUnique({ where: { id: req.params.slotId } }),
      prisma.timetableSlot.findUnique({ where: { id: targetSlotId } }),
    ]);
    if (!a || !b) return res.status(404).json({ error: 'Slot not found.' });
    if (a.isLocked || b.isLocked) return res.status(409).json({ error: 'Cannot swap locked slots.' });

    // Swap day/period
    await prisma.$transaction([
      prisma.timetableSlot.update({ where: { id: a.id }, data: { day: -1, period: -1 } }), // temp
      prisma.timetableSlot.update({ where: { id: b.id }, data: { day: a.day, period: a.period } }),
      prisma.timetableSlot.update({ where: { id: a.id }, data: { day: b.day, period: b.period } }),
    ]);

    res.json({ message: 'Swapped.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/timetable-auto/slots/:slotId/lock
router.patch('/slots/:slotId/lock', requireAdmin, async (req, res) => {
  try {
    const slot = await prisma.timetableSlot.update({
      where: { id: req.params.slotId },
      data: { isLocked: true },
    });
    res.json(slot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/timetable-auto/slots/:slotId
router.delete('/slots/:slotId', requireAdmin, async (req, res) => {
  try {
    const slot = await prisma.timetableSlot.findUnique({ where: { id: req.params.slotId } });
    if (slot?.isLocked) return res.status(409).json({ error: 'Cannot delete locked slot.' });
    await prisma.timetableSlot.delete({ where: { id: req.params.slotId } });
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
// GET /api/timetable-auto/configs/:id/class-configs
router.get('/configs/:id/class-configs', requireAuth, async (req, res) => {
  try {
    const configs = await prisma.classScheduleConfig.findMany({
      where: { configId: req.params.id },
      include: { section: { include: { gradeLevel: true } } },
    });
    res.json(configs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timetable-auto/configs/:id/class-configs
router.post('/configs/:id/class-configs', requireAdmin, async (req, res) => {
  const { sectionId, periodsPerDay, sessionDuration, breakAfterPeriods, breakDurations } = req.body;
  if (!sectionId) return res.status(400).json({ error: 'sectionId required.' });
  try {
    const cfg = await prisma.classScheduleConfig.upsert({
      where: { sectionId: parseInt(sectionId) },
      update: { periodsPerDay, sessionDuration, breakAfterPeriods, breakDurations, configId: req.params.id },
      create: { sectionId: parseInt(sectionId), configId: req.params.id, periodsPerDay, sessionDuration, breakAfterPeriods, breakDurations },
    });
    res.json(cfg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
