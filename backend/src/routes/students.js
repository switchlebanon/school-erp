const express = require("express");
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
} = require("../controllers/studentController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// All student routes require login
router.use(authenticate);

router.get("/", getStudents);
router.get("/:id", getStudentById);

// Only Admins can create, update, or delete student records
router.post("/", authorize("ADMIN"), createStudent);
router.post("/bulk", authorize("ADMIN"), bulkImportStudents);
router.put("/:id", authorize("ADMIN"), updateStudent);
router.delete("/:id", authorize("ADMIN"), deleteStudent);

module.exports = router;
