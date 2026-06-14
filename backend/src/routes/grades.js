const express = require("express");
const {
  getTerms,
  getGradesForClass,
  saveGradesBulk,
  getStudentGrades,
  getClassSummary,
} = require("../controllers/gradeController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/terms",         getTerms);
router.get("/class-summary", getClassSummary);
router.get("/student/:studentId", getStudentGrades);
router.get("/",              getGradesForClass);

// Only Admins/Teachers can save grades
router.post("/bulk", authorize("ADMIN", "TEACHER"), saveGradesBulk);

module.exports = router;
