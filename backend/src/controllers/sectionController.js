const prisma = require("../config/db");

// GET /api/sections
// Returns all sections with their grade level, for use in dropdowns
// e.g. "Grade 9 - A"
async function getSections(req, res) {
  try {
    const sections = await prisma.section.findMany({
      include: { gradeLevel: true, _count: { select: { students: true } } },
      orderBy: [
        { gradeLevel: { order: "asc" } },
        { name: "asc" },
      ],
    });

    res.json(sections);
  } catch (err) {
    console.error("getSections error:", err);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
}

// GET /api/sections/grade-levels
// Returns all grade levels (for dropdowns when adding a section)
async function getGradeLevels(req, res) {
  try {
    const grades = await prisma.gradeLevel.findMany({ orderBy: { order: "asc" } });
    res.json(grades);
  } catch (err) {
    console.error("getGradeLevels error:", err);
    res.status(500).json({ error: "Failed to fetch grade levels" });
  }
}

// POST /api/sections
// Body: { gradeName, gradeOrder?, sectionName }
// Creates the GradeLevel if it doesn't exist yet, then creates the Section.
async function createSection(req, res) {
  try {
    const { gradeName, gradeOrder, sectionName } = req.body;

    if (!gradeName || !sectionName) {
      return res.status(400).json({ error: "gradeName and sectionName are required" });
    }

    const trimmedGrade   = String(gradeName).trim();
    const trimmedSection = String(sectionName).trim();

    // Find or create the grade level
    let grade = await prisma.gradeLevel.findUnique({ where: { name: trimmedGrade } });
    if (!grade) {
      // Determine order: use provided value, or derive from any number in the name, or push to end
      let order = Number(gradeOrder);
      if (!order || isNaN(order)) {
        const match = trimmedGrade.match(/\d+/);
        if (match) {
          order = Number(match[0]);
        } else {
          const maxOrder = await prisma.gradeLevel.aggregate({ _max: { order: true } });
          order = (maxOrder._max.order || 0) + 1;
        }
      }
      grade = await prisma.gradeLevel.create({ data: { name: trimmedGrade, order } });
    }

    // Check section doesn't already exist for this grade
    const existing = await prisma.section.findUnique({
      where: { gradeLevelId_name: { gradeLevelId: grade.id, name: trimmedSection } },
    });
    if (existing) {
      return res.status(409).json({ error: `Section "${trimmedGrade} - ${trimmedSection}" already exists` });
    }

    const section = await prisma.section.create({
      data: { name: trimmedSection, gradeLevelId: grade.id },
      include: { gradeLevel: true },
    });

    res.status(201).json(section);
  } catch (err) {
    console.error("createSection error:", err);
    res.status(500).json({ error: "Failed to create section" });
  }
}

// DELETE /api/sections/:id
// Only allowed if the section has no students enrolled.
async function deleteSection(req, res) {
  try {
    const id = Number(req.params.id);

    const studentCount = await prisma.student.count({ where: { sectionId: id } });
    if (studentCount > 0) {
      return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are enrolled in this section` });
    }

    await prisma.section.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteSection error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Section not found" });
    res.status(500).json({ error: "Failed to delete section" });
  }
}

// PUT /api/sections/:id
// Body: { name }
async function updateSection(req, res) {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const section = await prisma.section.update({
      where: { id },
      data: { name: String(name).trim() },
      include: { gradeLevel: true },
    });
    res.json(section);
  } catch (err) {
    console.error("updateSection error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Section not found" });
    res.status(500).json({ error: "Failed to update section" });
  }
}

// PUT /api/sections/grade-levels/:id
// Body: { name }
async function updateGradeLevel(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, order } = req.body;
    if (!name && order === undefined) {
      return res.status(400).json({ error: "name or order is required" });
    }
    const grade = await prisma.gradeLevel.update({
      where: { id },
      data: {
        ...(name  !== undefined && { name: String(name).trim() }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    res.json(grade);
  } catch (err) {
    console.error("updateGradeLevel error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Grade level not found" });
    res.status(500).json({ error: "Failed to update grade level" });
  }
}

// POST /api/sections/grade-levels/reorder
// Body: { ids: [1, 3, 2, ...] } — ordered list of grade level IDs
// Sets order = index position for each
async function reorderGradeLevels(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array is required" });

    await Promise.all(
      ids.map((id, index) =>
        prisma.gradeLevel.update({ where: { id: Number(id) }, data: { order: index } })
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error("reorderGradeLevels error:", err);
    res.status(500).json({ error: "Failed to reorder grade levels" });
  }
}

// DELETE /api/sections/grade-levels/:id
async function deleteGradeLevel(req, res) {
  try {
    const id = Number(req.params.id);
    const sectionCount = await prisma.section.count({ where: { gradeLevelId: id } });
    if (sectionCount > 0) {
      return res.status(400).json({ error: `Cannot delete: ${sectionCount} section(s) belong to this grade level` });
    }
    await prisma.gradeLevel.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteGradeLevel error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Grade level not found" });
    res.status(500).json({ error: "Failed to delete grade level" });
  }
}

// GET /api/sections/subjects
// Returns all subjects (for dropdowns in Grades, Timetable, etc.)
async function getSubjects(req, res) {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json(subjects);
  } catch (err) {
    console.error("getSubjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
}

// A palette of distinct colors to assign to new subjects automatically
const SUBJECT_COLORS = [
  "#3D7EFF", "#22C55E", "#0EA5E9", "#6366F1", "#F59E0B", "#14B8A6",
  "#84CC16", "#A855F7", "#06B6D4", "#64748B", "#EF4444", "#EC4899",
  "#F97316", "#8B5CF6",
];

// POST /api/sections/subjects
// Body: { name, code?, color? }
// Creates a new subject. If color isn't provided, picks one from the palette.
async function createSubject(req, res) {
  try {
    const { name, code, color } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const trimmedName = String(name).trim();

    const existing = await prisma.subject.findUnique({ where: { name: trimmedName } });
    if (existing) {
      return res.status(409).json({ error: `Subject "${trimmedName}" already exists`, subject: existing });
    }

    let finalColor = color;
    if (!finalColor) {
      const count = await prisma.subject.count();
      finalColor = SUBJECT_COLORS[count % SUBJECT_COLORS.length];
    }

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        code: code ? String(code).trim() : null,
        color: finalColor,
      },
    });

    res.status(201).json(subject);
  } catch (err) {
    console.error("createSubject error:", err);
    res.status(500).json({ error: "Failed to create subject" });
  }
}

module.exports = {
  getSections, getGradeLevels, createSection, deleteSection,
  updateSection, updateGradeLevel, deleteGradeLevel, reorderGradeLevels,
  getSubjects, createSubject,
};
