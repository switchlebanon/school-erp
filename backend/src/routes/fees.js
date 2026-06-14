const express = require("express");
const {
  getFees, getFeeSummary, getFeeById,
  createFee, recordPayment, deletePayment, deleteFee,
} = require("../controllers/feeController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/",                           getFees);
router.get("/summary",                    getFeeSummary);
router.get("/:id",                        getFeeById);
router.post("/",          authorize("ADMIN"), createFee);
router.post("/:id/pay",   authorize("ADMIN"), recordPayment);
router.delete("/payments/:paymentId", authorize("ADMIN"), deletePayment);
router.delete("/:id",     authorize("ADMIN"), deleteFee);

module.exports = router;
