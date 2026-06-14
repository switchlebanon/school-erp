const express = require("express");
const { getSections, getGradeLevels, createSection, deleteSection, getSubjects } = require("../controllers/sectionController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", getSections);
router.get("/grade-levels", getGradeLevels);
router.get("/subjects", getSubjects);
router.post("/", authorize("ADMIN"), createSection);
router.delete("/:id", authorize("ADMIN"), deleteSection);

module.exports = router;
