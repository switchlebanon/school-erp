const express = require("express");
const { getSections, getGradeLevels, createSection, deleteSection, getSubjects, createSubject } = require("../controllers/sectionController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", getSections);
router.get("/grade-levels", getGradeLevels);
router.get("/subjects", getSubjects);
router.post("/subjects", authorize("ADMIN"), createSubject);
router.post("/", authorize("ADMIN"), createSection);
router.delete("/:id", authorize("ADMIN"), deleteSection);

module.exports = router;
