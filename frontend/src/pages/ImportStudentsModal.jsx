import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { C } from "../theme";
import { api } from "../api/client";

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px",
  fontSize: 12, outline: "none", boxSizing: "border-box",
};

// Fields we know about, and what they map to
const TARGET_FIELDS = [
  { key: "studentCode",   label: "Student Code", required: true },
  { key: "name",          label: "Full Name",    required: true },
  { key: "grade",         label: "Grade (e.g. Grade 9)", required: true },
  { key: "section",       label: "Section (e.g. A)",     required: true },
  { key: "status",        label: "Status",       required: false },
  { key: "dateOfBirth",   label: "Date of Birth", required: false },
  { key: "guardianName",  label: "Guardian Name", required: false },
  { key: "guardianPhone", label: "Guardian Phone", required: false },
];

// Try to auto-match a spreadsheet header to one of our target fields
function guessMapping(header) {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  const matches = {
    studentcode: "studentCode", code: "studentCode", id: "studentCode",
    name: "name", studentname: "name", fullname: "name",
    grade: "grade", gradelevel: "grade", class: "grade",
    section: "section",
    status: "status",
    dob: "dateOfBirth", dateofbirth: "dateOfBirth", birthdate: "dateOfBirth",
    guardian: "guardianName", guardianname: "guardianName", parent: "guardianName", parentname: "guardianName",
    guardianphone: "guardianPhone", phone: "guardianPhone", whatsapp: "guardianPhone", contact: "guardianPhone", parentphone: "guardianPhone",
  };
  return matches[h] || "";
}

export default function ImportStudentsModal({ onClose, onDone }) {
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("upload"); // "upload" | "map" | "preview" | "result"
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({}); // { header: targetField }
  const [rows, setRows] = useState([]); // mapped + editable rows
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // ── Step 1: File upload ──────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (json.length < 2) {
          setError("The file doesn't seem to have any data rows.");
          return;
        }

        const fileHeaders = json[0].map(h => String(h).trim());
        const dataRows = json.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));

        // Auto-guess mapping
        const guessed = {};
        fileHeaders.forEach(h => {
          const guess = guessMapping(h);
          if (guess) guessed[h] = guess;
        });

        setHeaders(fileHeaders);
        setRawRows(dataRows);
        setMapping(guessed);
        setStep("map");
      } catch (err) {
        setError("Couldn't read this file. Please make sure it's a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Step 2: Column mapping -> Step 3: build editable rows ────
  const buildPreviewRows = () => {
    // Validate: required fields must be mapped
    const mappedTargets = new Set(Object.values(mapping).filter(Boolean));
    const missingRequired = TARGET_FIELDS.filter(f => f.required && !mappedTargets.has(f.key));
    if (missingRequired.length > 0) {
      setError(`Please map these required fields: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    const headerIndex = (header) => headers.indexOf(header);

    const built = rawRows.map((row, i) => {
      const obj = { _rowNum: i + 1 };
      TARGET_FIELDS.forEach(f => { obj[f.key] = ""; });

      Object.entries(mapping).forEach(([header, target]) => {
        if (!target) return;
        const idx = headerIndex(header);
        let val = row[idx] !== undefined ? String(row[idx]).trim() : "";

        // Normalize "Grade 9" vs "9" -> "Grade 9"
        if (target === "grade" && val && !/grade/i.test(val)) {
          val = `Grade ${val}`;
        }
        // Normalize date if it's an Excel serial number
        if (target === "dateOfBirth" && val && /^\d+(\.\d+)?$/.test(val)) {
          const date = XLSX.SSF.parse_date_code(Number(val));
          if (date) val = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
        }

        obj[target] = val;
      });

      return obj;
    });

    setRows(built);
    setError("");
    setStep("preview");
  };

  // ── Step 3: edit a cell inline ───────────────────────────────
  const updateCell = (rowIdx, field, value) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
  };

  const removeRow = (rowIdx) => {
    setRows(prev => prev.filter((_, i) => i !== rowIdx));
  };

  // Validation status per row
  const rowIssues = useMemo(() => {
    return rows.map(r => {
      const issues = [];
      if (!r.studentCode?.trim()) issues.push("Missing code");
      if (!r.name?.trim())        issues.push("Missing name");
      if (!r.grade?.trim())       issues.push("Missing grade");
      if (!r.section?.trim())     issues.push("Missing section");
      return issues;
    });
  }, [rows]);

  const validRowCount = rowIssues.filter(issues => issues.length === 0).length;

  // ── Step 4: submit ────────────────────────────────────────────
  const handleImport = async () => {
    setError("");
    setImporting(true);
    try {
      const payload = rows.map(({ _rowNum, ...rest }) => rest);
      const result = await api.post("/students/bulk", { students: payload });
      setImportResult(result);
      setStep("result");
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 14, width: 760, maxWidth: "100%",
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>Import Students</h2>
            <p style={{ fontSize: 12, color: C.slate, margin: "3px 0 0" }}>
              {step === "upload" && "Upload an Excel or CSV file"}
              {step === "map"    && `${fileName} — Map columns to student fields`}
              {step === "preview" && `${rows.length} rows — Review and fix before importing`}
              {step === "result" && "Import complete"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.slate }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${C.border}`, borderRadius: 12,
                  padding: "48px 24px", textAlign: "center", cursor: "pointer",
                  background: C.slateL,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>
                  Click to upload a spreadsheet
                </div>
                <div style={{ fontSize: 12, color: C.slate }}>
                  Supports .xlsx, .xls, and .csv files
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ marginTop: 20, background: C.accentL, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Expected Columns
                </div>
                <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
                  Your spreadsheet should ideally have columns for: <b>Student Code</b>, <b>Name</b>, <b>Grade</b> (e.g. "Grade 9" or "9"), <b>Section</b> (e.g. "A"), and optionally <b>Status</b>, <b>Date of Birth</b>, <b>Guardian Name</b>, and <b>Guardian Phone</b>.
                  <br /><br />
                  Don't worry about exact column names — you'll be able to map and edit everything in the next step.
                </div>
              </div>

              {error && (
                <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginTop: 14 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Column mapping ── */}
          {step === "map" && (
            <div>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>
                We auto-detected some columns. Adjust any mappings below — choose "Don't import" for columns you want to skip.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {headers.map(header => (
                  <div key={header} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", background: C.slateL, borderRadius: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{header}</div>
                      <div style={{ fontSize: 11, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        e.g. "{rawRows[0]?.[headers.indexOf(header)] ?? ""}"
                      </div>
                    </div>
                    <span style={{ color: C.slate }}>→</span>
                    <select
                      value={mapping[header] || ""}
                      onChange={e => setMapping(prev => ({ ...prev, [header]: e.target.value }))}
                      style={{ ...inputStyle, width: 200, fontSize: 13, padding: "8px 10px" }}
                    >
                      <option value="">Don't import</option>
                      {TARGET_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginTop: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setStep("upload")} style={{
                  background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                  padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Back</button>
                <button onClick={buildPreviewRows} style={{
                  background: C.accent, color: C.white, border: "none", borderRadius: 8,
                  padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Continue → Preview</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview & edit ── */}
          {step === "preview" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12, color: C.textMid }}>
                  <span style={{ fontWeight: 700, color: C.green }}>{validRowCount}</span> of {rows.length} rows are ready to import.
                  Rows with issues will be skipped — fix them below or remove the row.
                </div>
              </div>

              <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: C.slateL }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>#</th>
                      {TARGET_FIELDS.map(f => (
                        <th key={f.key} style={{ padding: "8px 10px", textAlign: "left", color: C.slate, fontWeight: 600, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          {f.label}{f.required ? " *" : ""}
                        </th>
                      ))}
                      <th style={{ padding: "8px 10px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const issues = rowIssues[i];
                      const hasIssue = issues.length > 0;
                      return (
                        <tr key={i} style={{
                          borderTop: `1px solid ${C.border}`,
                          background: hasIssue ? C.redL : i % 2 === 0 ? C.white : C.slateL,
                        }}>
                          <td style={{ padding: "6px 10px", color: C.slate, fontWeight: 600, verticalAlign: "top" }}>
                            {row._rowNum}
                            {hasIssue && (
                              <div style={{ fontSize: 10, color: C.red, fontWeight: 600, marginTop: 2 }}>
                                {issues.join(", ")}
                              </div>
                            )}
                          </td>
                          {TARGET_FIELDS.map(f => (
                            <td key={f.key} style={{ padding: "4px 6px", minWidth: 110 }}>
                              {f.key === "status" ? (
                                <select value={row.status || "ACTIVE"} onChange={e => updateCell(i, "status", e.target.value)} style={inputStyle}>
                                  <option value="ACTIVE">Active</option>
                                  <option value="INACTIVE">Inactive</option>
                                  <option value="GRADUATED">Graduated</option>
                                  <option value="TRANSFERRED">Transferred</option>
                                </select>
                              ) : f.key === "dateOfBirth" ? (
                                <input type="date" value={row.dateOfBirth || ""} onChange={e => updateCell(i, "dateOfBirth", e.target.value)} style={inputStyle} />
                              ) : (
                                <input
                                  value={row[f.key] || ""}
                                  onChange={e => updateCell(i, f.key, e.target.value)}
                                  placeholder={f.required ? "Required" : "—"}
                                  style={{
                                    ...inputStyle,
                                    border: f.required && !row[f.key] ? `1px solid ${C.red}` : `1px solid ${C.border}`,
                                  }}
                                />
                              )}
                            </td>
                          ))}
                          <td style={{ padding: "4px 6px" }}>
                            <button onClick={() => removeRow(i)} title="Remove row" style={{
                              background: "none", border: "none", color: C.slate,
                              cursor: "pointer", fontSize: 14, padding: 2,
                            }}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && (
                <div style={{ background: C.redL, color: C.red, fontSize: 12, fontWeight: 500, padding: "8px 12px", borderRadius: 8, marginTop: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                <button onClick={() => setStep("map")} style={{
                  background: C.slateL, color: C.textMid, border: "none", borderRadius: 8,
                  padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Back</button>
                <button onClick={handleImport} disabled={importing || rows.length === 0} style={{
                  background: C.green, color: C.white, border: "none", borderRadius: 8,
                  padding: "9px 22px", fontWeight: 600, fontSize: 13,
                  cursor: importing ? "default" : "pointer", opacity: importing ? 0.7 : 1,
                }}>
                  {importing ? "Importing…" : `Import ${rows.length} Student${rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Result ── */}
          {step === "result" && importResult && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  ["Created", importResult.summary.created, C.green, C.greenL],
                  ["Skipped (duplicates)", importResult.summary.skipped, C.amber, C.amberL],
                  ["Errors", importResult.summary.errors, C.red, C.redL],
                ].map(([label, val, color, bg]) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Detail list for skipped/errors */}
              {importResult.results.some(r => r.status !== "created") && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ background: C.slateL, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Issues
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {importResult.results.filter(r => r.status !== "created").map((r, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", gap: 12,
                        padding: "8px 12px", fontSize: 12, borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                      }}>
                        <span style={{ color: C.text }}>
                          Row {r.row}: {r.data?.name || r.data?.studentCode || "—"}
                        </span>
                        <span style={{
                          color: r.status === "skipped" ? C.amber : C.red,
                          fontWeight: 600, textAlign: "right", flexShrink: 0,
                        }}>
                          {r.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={onDone} style={{
                  background: C.accent, color: C.white, border: "none", borderRadius: 8,
                  padding: "9px 22px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>Done</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
