const express = require("express");
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
} = require("../controllers/teacherController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", getTeachers);
router.get("/:id", getTeacherById);

// Only Admins can manage teacher accounts
router.post("/",   authorize("ADMIN"), createTeacher);
router.put("/:id", authorize("ADMIN"), updateTeacher);
router.delete("/:id", authorize("ADMIN"), deleteTeacher);
router.post("/:id/reset-password", authorize("ADMIN"), resetTeacherPassword);

module.exports = router;
