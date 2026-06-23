import { C } from "../theme";
import { canAccess } from "../permissions";

export const NAV = [
  { id: "dashboard",     icon: "⊞",  label: "Dashboard"  },
  { id: "students",      icon: "👤", label: "Students"   },
  { id: "classes",       icon: "🏫", label: "Classes"    },
  { id: "teachers",      icon: "🎓", label: "Teachers"   },
  { id: "employees",     icon: "🧑‍💼", label: "Employees"  },
  { id: "attendance",    icon: "📋", label: "Attendance" },
  { id: "timetable",     icon: "📅", label: "Timetable"  },
  { id: "grades",        icon: "📊", label: "Grades"     },
  { id: "fees",          icon: "💳", label: "Fees"       },
  { id: "payroll",       icon: "💰", label: "Payroll"    },
  { id: "expenses",      icon: "🧾", label: "Expenses"   },
  { id: "announcements", icon: "📣", label: "Notices"    },
  { id: "users",         icon: "🔑", label: "Users"      },
];

export default function Sidebar({ active, onNav, open, onToggle, user, onLogout, mobile }) {
  // On mobile: always show full width (220px). On desktop: collapses to 64px icon-only.
  const W = (!mobile && !open) ? 64 : 220;
  const showLabels = mobile || open;
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div style={{
      width: W, minHeight: "100vh", background: C.navy,
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif", flexShrink: 0,
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Header: logo + collapse toggle (desktop only) */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: showLabels ? "space-between" : "center",
        padding: showLabels ? "16px 14px 12px" : "16px 0 12px",
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
        minHeight: 60, gap: 8,
      }}>
        {showLabels && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: C.accent, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>🎓</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>S³ ERP</div>
              <div style={{ color: "#7B93BE", fontSize: 10, whiteSpace: "nowrap" }}>SWITCH Lebanon</div>
            </div>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button
            onClick={onToggle}
            style={{
              background: "none", border: "none", color: "#7B93BE",
              cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? "◀" : "▶"}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: showLabels ? "12px 10px" : "12px 8px", flex: 1, overflowY: "auto" }}>
        {NAV.filter(n => canAccess(user?.role, n.id)).map(n => {
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNav(n.id)}
              style={{
                display: "flex", alignItems: "center",
                gap: showLabels ? 10 : 0,
                justifyContent: showLabels ? "flex-start" : "center",
                width: "100%",
                padding: showLabels ? "9px 10px" : "10px 0",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: isActive ? C.accent : "transparent",
                color: isActive ? C.white : "#A8BFDF",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
                marginBottom: 2,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{n.icon}</span>
              {showLabels && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div style={{
        borderTop: `1px solid rgba(255,255,255,0.08)`,
        padding: showLabels ? "10px 12px" : "10px 8px",
      }}>
        <button
          onClick={() => onNav("account")}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: showLabels ? "flex-start" : "center",
            gap: showLabels ? 10 : 0,
            width: "100%", background: "none", border: "none",
            cursor: "pointer", borderRadius: 8, padding: "6px 4px",
            marginBottom: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: C.accent, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 700, fontSize: 13,
          }}>{initial}</div>
          {showLabels && (
            <div style={{ overflow: "hidden", flex: 1, textAlign: "left" }}>
              <div style={{ color: C.white, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Guest"}</div>
              <div style={{ color: "#7B93BE", fontSize: 11, whiteSpace: "nowrap" }}>{user?.role}</div>
            </div>
          )}
        </button>

        <button
          onClick={onLogout}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: showLabels ? "flex-start" : "center",
            gap: showLabels ? 8 : 0,
            width: "100%", background: "none", border: "none",
            cursor: "pointer", color: "#7B93BE", fontSize: 13,
            borderRadius: 8, padding: "6px 4px",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⏏</span>
          {showLabels && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}
