import { useState } from "react";
import { C } from "../theme";
import { NAV } from "./Sidebar";
import { downloadFile } from "../api/client";

export default function Topbar({ page, user }) {
  const label = NAV.find(n => n.id === page)?.label ?? "Dashboard";
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";
  const isAdmin = user?.role === "ADMIN";

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleBackup = async () => {
    setExporting(true);
    setExportError("");
    try {
      await downloadFile("/export/all", "schoolhub-backup.xlsx");
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
        <button
          onClick={handleBackup}
          disabled={exporting}
          title="Download a full Excel backup of all data"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.accentL, color: C.accent, border: "none",
            borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
            cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {exporting ? "Exporting…" : "📥 Backup (Excel)"}
        </button>
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
