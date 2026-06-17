const express = require("express");
const {
  getUsers, createUser, updateUser, resetUserPassword, deleteUser,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/",                    getUsers);
router.post("/",                   createUser);
router.put("/:id",                 updateUser);
router.post("/:id/reset-password", resetUserPassword);
router.delete("/:id",              deleteUser);

module.exports = router;
