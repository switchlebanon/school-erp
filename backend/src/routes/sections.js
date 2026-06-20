const express = require("express");
const {
  getSections, getGradeLevels, createSection, deleteSection,
  updateSection, updateGradeLevel, deleteGradeLevel, reorderGradeLevels,
  getSubjects, createSubject,
} = require("../controllers/sectionController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/",             getSections);
router.get("/grade-levels", getGradeLevels);
router.get("/subjects",     getSubjects);

router.post("/",                          authorize("ADMIN"), createSection);
router.post("/grade-levels/reorder",      authorize("ADMIN"), reorderGradeLevels);
router.put("/:id",                        authorize("ADMIN"), updateSection);
router.delete("/:id",                     authorize("ADMIN"), deleteSection);

router.put("/grade-levels/:id",           authorize("ADMIN"), updateGradeLevel);
router.delete("/grade-levels/:id",        authorize("ADMIN"), deleteGradeLevel);

router.post("/subjects",    authorize("ADMIN"), createSubject);

module.exports = router;
