const express = require("express");
const {
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/",         getExpenses);
router.get("/summary",  getExpenseSummary);
router.get("/:id",      getExpenseById);
router.post("/",        createExpense);
router.put("/:id",      updateExpense);
router.delete("/:id",   deleteExpense);

module.exports = router;
