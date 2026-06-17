const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

const employeeInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
};

// GET /api/employees
async function getEmployees(req, res) {
  try {
    const { search, status } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { jobTitle: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: { user: { name: "asc" } },
    });

    res.json(employees);
  } catch (err) {
    console.error("getEmployees error:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
}

// GET /api/employees/:id
async function getEmployeeById(req, res) {
  try {
    const id = Number(req.params.id);
    const employee = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    console.error("getEmployeeById error:", err);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
}

// POST /api/employees
// Body: { name, email, phone?, jobTitle, baseSalary?, status? }
async function createEmployee(req, res) {
  try {
    const { name, email, phone, jobTitle, baseSalary, status } = req.body;

    if (!name || !email || !jobTitle) {
      return res.status(400).json({ error: "name, email and jobTitle are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const plainPassword = generatePassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashed,
        role: "EMPLOYEE",
        phone: phone ? String(phone).trim() : null,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        jobTitle: String(jobTitle).trim(),
        baseSalary: baseSalary !== undefined && baseSalary !== "" ? Number(baseSalary) : null,
        status: status || "ACTIVE",
      },
      include: employeeInclude,
    });

    res.status(201).json({ ...employee, account: { email: user.email, password: plainPassword } });
  } catch (err) {
    console.error("createEmployee error:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
}

// PUT /api/employees/:id
// Body: { name?, phone?, jobTitle?, baseSalary?, status? }
async function updateEmployee(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, phone, jobTitle, baseSalary, status } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (name !== undefined || phone !== undefined) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          ...(name !== undefined && { name: String(name).trim() }),
          ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        },
      });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(jobTitle !== undefined && { jobTitle: String(jobTitle).trim() }),
        ...(baseSalary !== undefined && { baseSalary: baseSalary === "" || baseSalary === null ? null : Number(baseSalary) }),
        ...(status !== undefined && { status }),
      },
      include: employeeInclude,
    });

    res.json(updated);
  } catch (err) {
    console.error("updateEmployee error:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
}

// DELETE /api/employees/:id
async function deleteEmployee(req, res) {
  try {
    const id = Number(req.params.id);
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await prisma.salaryPayment.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });
    await prisma.user.delete({ where: { id: employee.userId } });

    res.status(204).send();
  } catch (err) {
    console.error("deleteEmployee error:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
}

// POST /api/employees/:id/reset-password
async function resetEmployeePassword(req, res) {
  try {
    const id = Number(req.params.id);
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const plainPassword = generatePassword();
    const hashed = await bcrypt.hash(plainPassword, 10);
    await prisma.user.update({ where: { id: employee.userId }, data: { password: hashed } });

    res.json({ password: plainPassword });
  } catch (err) {
    console.error("resetEmployeePassword error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
};
