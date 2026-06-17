const express = require("express");
const {
  getTimetable, getConflicts, createEntry, updateEntry, deleteEntry,
} = require("../controllers/timetableController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/",          getTimetable);
router.get("/conflicts", authorize("ADMIN", "TEACHER"), getConflicts);
router.post("/",         authorize("ADMIN", "TEACHER"), createEntry);
router.put("/:id",       authorize("ADMIN", "TEACHER"), updateEntry);
router.delete("/:id",    authorize("ADMIN", "TEACHER"), deleteEntry);

module.exports = router;
