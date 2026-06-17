const express = require("express");
const {
  getPayrollForMonth,
  savePayrollEntry,
  getPayrollHistory,
  getPayrollSummary,
} = require("../controllers/payrollController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/",            getPayrollForMonth);
router.get("/summary",     getPayrollSummary);
router.get("/history/:userId", getPayrollHistory);
router.post("/",           savePayrollEntry);

module.exports = router;
