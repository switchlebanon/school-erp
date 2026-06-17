const express = require("express");
const {
  getAttendanceForClass,
  saveAttendanceBulk,
  getStudentAttendance,
  getAttendanceSummary,
  getYearlyAbsenceSummary,
} = require("../controllers/attendanceController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/summary", authorize("ADMIN", "TEACHER"), getAttendanceSummary);
router.get("/yearly/:studentId", getYearlyAbsenceSummary);
router.get("/student/:studentId", getStudentAttendance);
router.get("/", authorize("ADMIN", "TEACHER"), getAttendanceForClass);

router.post("/bulk", authorize("ADMIN", "TEACHER"), saveAttendanceBulk);

module.exports = router;
