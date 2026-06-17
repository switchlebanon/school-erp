const prisma = require("../config/db");

const entryInclude = {
  subject: true,
  teacher: { include: { user: { select: { id: true, name: true } } } },
};

// GET /api/timetable?sectionId=
// Returns all timetable entries for a given section.
async function getTimetable(req, res) {
  try {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ error: "sectionId is required" });

    const entries = await prisma.timetableEntry.findMany({
      where: { sectionId: Number(sectionId) },
      include: entryInclude,
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    res.json(entries.map(formatEntry));
  } catch (err) {
    console.error("getTimetable error:", err);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
}

// GET /api/timetable/conflicts?sectionId=
// Finds scheduling conflicts for a section:
// - Teacher scheduled at the same time in another class
async function getConflicts(req, res) {
  try {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ error: "sectionId is required" });

    const entries = await prisma.timetableEntry.findMany({
      where: { sectionId: Number(sectionId), teacherId: { not: null } },
      include: entryInclude,
    });

    const conflicts = new Set(); // set of entry IDs that have a conflict

    for (const entry of entries) {
      if (!entry.teacherId) continue;

      // Find other entries where same teacher, same day, overlapping time
      const overlapping = await prisma.timetableEntry.findMany({
        where: {
          teacherId: entry.teacherId,
          day: entry.day,
          sectionId: { not: Number(sectionId) }, // in a different class
          OR: [
            // other entry starts during this entry
            { startTime: { gte: entry.startTime, lt: entry.endTime } },
            // other entry ends during this entry
            { endTime: { gt: entry.startTime, lte: entry.endTime } },
            // other entry completely wraps this entry
            { startTime: { lte: entry.startTime }, endTime: { gte: entry.endTime } },
          ],
        },
        include: {
          section: { include: { gradeLevel: true } },
          subject: { select: { name: true } },
        },
      });

      if (overlapping.length > 0) {
        conflicts.add(entry.id);
      }
    }

    res.json({ conflictIds: [...conflicts] });
  } catch (err) {
    console.error("getConflicts error:", err);
    res.status(500).json({ error: "Failed to check conflicts" });
  }
}

// POST /api/timetable
// Body: { sectionId, subjectId, teacherId?, day, startTime, endTime }
async function createEntry(req, res) {
  try {
    const { sectionId, subjectId, teacherId, day, startTime, endTime } = req.body;

    if (!sectionId || !subjectId || !day || !startTime || !endTime) {
      return res.status(400).json({ error: "sectionId, subjectId, day, startTime and endTime are required" });
    }

    const existing = await prisma.timetableEntry.findUnique({
      where: { sectionId_day_startTime: { sectionId: Number(sectionId), day, startTime } },
    });
    if (existing) {
      return res.status(409).json({ error: `A slot already exists on ${day} at ${startTime} for this class` });
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        teacherId: teacherId ? Number(teacherId) : null,
        day,
        startTime,
        endTime,
      },
      include: entryInclude,
    });

    res.status(201).json(formatEntry(entry));
  } catch (err) {
    console.error("createEntry error:", err);
    res.status(500).json({ error: "Failed to create timetable entry" });
  }
}

// PUT /api/timetable/:id
// Body: { subjectId?, teacherId?, startTime?, endTime? }
async function updateEntry(req, res) {
  try {
    const id = Number(req.params.id);
    const { subjectId, teacherId, startTime, endTime } = req.body;

    const entry = await prisma.timetableEntry.update({
      where: { id },
      data: {
        ...(subjectId  !== undefined && { subjectId:  Number(subjectId) }),
        ...(teacherId  !== undefined && { teacherId: teacherId ? Number(teacherId) : null }),
        ...(startTime  !== undefined && { startTime }),
        ...(endTime    !== undefined && { endTime }),
      },
      include: entryInclude,
    });

    res.json(formatEntry(entry));
  } catch (err) {
    console.error("updateEntry error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Entry not found" });
    res.status(500).json({ error: "Failed to update timetable entry" });
  }
}

// DELETE /api/timetable/:id
async function deleteEntry(req, res) {
  try {
    await prisma.timetableEntry.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteEntry error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Entry not found" });
    res.status(500).json({ error: "Failed to delete entry" });
  }
}

function formatEntry(e) {
  return {
    id: e.id,
    sectionId: e.sectionId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
    subject: e.subject ? { id: e.subject.id, name: e.subject.name, color: e.subject.color } : null,
    teacher: e.teacher ? { id: e.teacher.id, name: e.teacher.user?.name } : null,
  };
}

module.exports = { getTimetable, getConflicts, createEntry, updateEntry, deleteEntry };
