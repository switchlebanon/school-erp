const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

const SAFE_FIELDS = {
  id: true, name: true, email: true, role: true,
  phone: true, isActive: true, createdAt: true,
};

// GET /api/users
// Admin: list all user accounts
async function getUsers(req, res) {
  try {
    const { role, search } = req.query;
    const where = {};
    if (role && role !== "ALL") where.role = role;
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        ...SAFE_FIELDS,
        studentAccount: { select: { id: true, studentCode: true, name: true } },
        teacher:        { select: { id: true, status: true } },
        employee:       { select: { id: true, status: true, jobTitle: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// POST /api/users
// Admin: create a new user account (teacher, parent, admin, student login)
async function createUser(req, res) {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required" });
    }
    if (!["ADMIN", "TEACHER", "PARENT", "STUDENT", "EMPLOYEE"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashed,
        role,
        phone: phone ? String(phone).trim() : null,
      },
      select: SAFE_FIELDS,
    });

    res.status(201).json(user);
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
}

// PUT /api/users/:id
// Admin: update a user's name, role, phone, or active status
async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, role, phone, isActive } = req.body;

    if (role && !["ADMIN", "TEACHER", "PARENT", "STUDENT", "EMPLOYEE"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Prevent an admin from deactivating/demoting themselves into a lockout
    if (id === req.user.id) {
      if (role && role !== "ADMIN") {
        return res.status(400).json({ error: "You cannot change your own role" });
      }
      if (isActive === false) {
        return res.status(400).json({ error: "You cannot deactivate your own account" });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(role !== undefined && { role }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      select: SAFE_FIELDS,
    });

    res.json(user);
  } catch (err) {
    console.error("updateUser error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(500).json({ error: "Failed to update user" });
  }
}

// POST /api/users/:id/reset-password
// Admin: set a new password for another user (e.g. they forgot it)
async function resetUserPassword(req, res) {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "newPassword must be at least 6 characters" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ success: true });
  } catch (err) {
    console.error("resetUserPassword error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(500).json({ error: "Failed to reset password" });
  }
}

// DELETE /api/users/:id
// Admin: delete a user account
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // If deleting a PARENT, unlink them from all their students first
    if (user.role === "PARENT") {
      await prisma.student.updateMany({
        where: { guardianId: id },
        data:  { guardianId: null },
      });
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteUser error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(500).json({ error: "Failed to delete user" });
  }
}

module.exports = { getUsers, createUser, updateUser, resetUserPassword, deleteUser };
