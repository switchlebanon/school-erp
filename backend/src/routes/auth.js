const express = require("express");
const { register, login, me, updateProfile, changePassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

module.exports = router;
