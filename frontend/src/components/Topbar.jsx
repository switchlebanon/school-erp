import { useState, useRef, useEffect } from "react";
import { C } from "../theme";
import { NAV } from "./Sidebar";
import { downloadFile } from "../api/client";

// Maps page IDs to their export endpoint + filename + label.
// Pages without a backend export (e.g. dashboard, account, timetable)
// are omitted — those won't show a "Backup this page" option.
const PAGE_EXPORTS = {
  students:      { path: "/export/students",      file: "scube-students.xlsx",      label: "Students" },
  teachers:      { path: "/export/teachers",       file: "scube-teachers.xlsx",      label: "Teachers" },
  employees:     { path: "/export/employees",      file: "scube-employees.xlsx",     label: "Employees" },
  attendance:    { path: "/export/attendance",     file: "scube-attendance.xlsx",    label: "Attendance" },
  grades:        { path: "/export/grades",         file: "scube-grades.xlsx",        label: "Grades" },
  fees:          { path: "/export/fees",           file: "scube-fees.xlsx",          label: "Fees" },
  payroll:       { path: "/export/payroll",        file: "scube-payroll.xlsx",       label: "Payroll" },
  expenses:      { path: "/export/expenses",       file: "scube-expenses.xlsx",      label: "Expenses" },
  announcements: { path: "/export/announcements",  file: "scube-announcements.xlsx", label: "Announcements" },
  users:         { path: "/export/users",          file: "scube-users.xlsx",         label: "Users" },
};

export default function Topbar({ page, user }) {
  const label = page === "account" ? "My Account" : page === "users" ? "Manage Users" : (NAV.find(n => n.id === page)?.label ?? "Dashboard");
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";
  const isAdmin = user?.role === "ADMIN";

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const pageExport = PAGE_EXPORTS[page];

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const runExport = async (path, file) => {
    setExporting(true);
    setExportError("");
    setMenuOpen(false);
    try {
      await downloadFile(path, file);
    } catch (err) {
      setExportError(err.message || "Export failed");
      setTimeout(() => setExportError(""), 4000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      height: 56, background: C.white, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", padding: "0 28px",
      gap: 12, flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{label}</span>
      <span style={{ flex: 1 }} />

      {exportError && (
        <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{exportError}</span>
      )}

      {isAdmin && (
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            disabled={exporting}
            title="Download data as Excel"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.accentL, color: C.accent, border: "none",
              borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
              cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {exporting ? "Exporting…" : "📥 Backup ▾"}
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(15,23,42,0.12)", minWidth: 200,
              zIndex: 50, overflow: "hidden", padding: 4,
            }}>
              {pageExport && (
                <>
                  <button
                    onClick={() => runExport(pageExport.path, pageExport.file)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: "none", border: "none", borderRadius: 6,
                      padding: "9px 12px", fontSize: 13, fontWeight: 600, color: C.text,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.slateL}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    📄 Backup {pageExport.label}
                  </button>
                  <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                </>
              )}
              <button
                onClick={() => runExport("/export/all", "scube-backup.xlsx")}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: "none", border: "none", borderRadius: 6,
                  padding: "9px 12px", fontSize: 13, fontWeight: 600, color: C.accent,
                  cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentL}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                🗂️ Backup All (Full Export)
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{
        width: 32, height: 32, borderRadius: 8, background: C.accentL,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }}>🔔</div>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: C.accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.white, fontWeight: 700, fontSize: 13,
      }}>{initial}</div>
    </div>
  );
}
