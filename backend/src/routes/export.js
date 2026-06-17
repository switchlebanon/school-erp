const express = require("express");
const {
  exportAll,
  exportStudents,
  exportTeachers,
  exportEmployees,
  exportSections,
  exportAttendance,
  exportGrades,
  exportFees,
  exportPayroll,
  exportExpenses,
  exportAnnouncements,
  exportUsers,
} = require("../controllers/exportController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Full backup (all data, multiple sheets)
router.get("/all", authorize("ADMIN"), exportAll);

// Per-page exports (admin only)
router.get("/students",      authorize("ADMIN"), exportStudents);
router.get("/teachers",      authorize("ADMIN"), exportTeachers);
router.get("/employees",     authorize("ADMIN"), exportEmployees);
router.get("/classes",       authorize("ADMIN"), exportSections);
router.get("/attendance",    authorize("ADMIN"), exportAttendance);
router.get("/grades",        authorize("ADMIN"), exportGrades);
router.get("/fees",          authorize("ADMIN"), exportFees);
router.get("/payroll",       authorize("ADMIN"), exportPayroll);
router.get("/expenses",      authorize("ADMIN"), exportExpenses);
router.get("/announcements", authorize("ADMIN"), exportAnnouncements);
router.get("/users",         authorize("ADMIN"), exportUsers);

module.exports = router;
