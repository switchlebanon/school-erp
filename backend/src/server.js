require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes    = require("./routes/auth");
const studentRoutes = require("./routes/students");
const sectionRoutes = require("./routes/sections");
const feeRoutes     = require("./routes/fees");
const exportRoutes  = require("./routes/export");
const gradeRoutes          = require("./routes/grades");
const academicYearsRoutes  = require("./routes/academicYears");
const promotionsRoutes     = require("./routes/promotions");
const messagesRoutes       = require("./routes/messages");
const reportCardRoutes     = require("./routes/reportCard");
const userRoutes    = require("./routes/users");
const teacherRoutes = require("./routes/teachers");
const employeeRoutes = require("./routes/employees");
const payrollRoutes  = require("./routes/payroll");
const expenseRoutes  = require("./routes/expenses");
const attendanceRoutes = require("./routes/attendance");
const timetableRoutes  = require("./routes/timetable");
const timetableAutoRouter = require('./routes/timetableAuto');
const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/fees",     feeRoutes);
app.use("/api/export",   exportRoutes);
app.use("/api/grades",   gradeRoutes);
app.use("/api/grades",          gradeRoutes);
app.use("/api/academic-years",  academicYearsRoutes);
app.use("/api/promotions",      promotionsRoutes);
app.use("/api/messages",        messagesRoutes);
app.use("/api/report-card",     reportCardRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payroll",  payrollRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/attendance", attendanceRoutes);

app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable",  timetableRoutes);
app.use('/api/timetable-auto', timetableAutoRouter);
// ─── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 S³ API running on http://localhost:${PORT}`);
});
