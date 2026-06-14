require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes    = require("./routes/auth");
const studentRoutes = require("./routes/students");
const sectionRoutes = require("./routes/sections");
const feeRoutes     = require("./routes/fees");
const exportRoutes  = require("./routes/export");
const gradeRoutes   = require("./routes/grades");

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

// More modules will be added here as they're built:
// app.use("/api/teachers", teacherRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/grades", gradeRoutes);
// app.use("/api/fees", feeRoutes);
// app.use("/api/timetable", timetableRoutes);
// app.use("/api/announcements", announcementRoutes);

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
  console.log(`🚀 SchoolHub API running on http://localhost:${PORT}`);
});
