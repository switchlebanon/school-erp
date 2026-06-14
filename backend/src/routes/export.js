const express = require("express");
const { exportAll } = require("../controllers/exportController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Only Admins can download a full data export
router.get("/all", authorize("ADMIN"), exportAll);

module.exports = router;
