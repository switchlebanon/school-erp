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

export default function Sidebar({ active, onNav, open, onToggle, user, onLogout }) {
  const W = open ? 220 : 64;
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div style={{
      width: W, minHeight: "100vh", background: C.navy,
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif", flexShrink: 0,
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
      position: "relative",
      zIndex: 10,
    }}>
      {/* Header: logo + toggle */}
      <div style={{
        padding: open ? "20px 16px 16px" : "20px 0 16px",
        borderBottom: `1px solid ${C.navyMid}`,
        display: "flex", alignItems: "center",
        justifyContent: open ? "space-between" : "center",
        minHeight: 64,
      }}>
        {open && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: C.accent, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>🏫</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: "nowrap" }}>S³</div>
              <div style={{ color: "#7B93BE", fontSize: 11, whiteSpace: "nowrap" }}>ERP System</div>
            </div>
          </div>
        )}
        {/* Toggle button */}
        <button
          onClick={onToggle}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#7B93BE", fontSize: 18, lineHeight: 1,
            padding: "4px 6px", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {open ? "◀" : "▶"}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: open ? "12px 10px" : "12px 8px", flex: 1 }}>
        {NAV.filter(n => canAccess(user?.role, n.id)).map(n => {
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNav(n.id)}
              title={!open ? n.label : undefined}
              style={{
                display: "flex", alignItems: "center",
                gap: open ? 10 : 0,
                justifyContent: open ? "flex-start" : "center",
                width: "100%",
                padding: open ? "9px 12px" : "10px 0",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: isActive ? C.accent : "transparent",
                color: isActive ? C.white : "#A8BBDB",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14, marginBottom: 2,
                transition: "background 0.15s",
                textAlign: "left",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{n.icon}</span>
              {open && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        onClick={() => onNav("account")}
        title="My Account"
        style={{
          padding: open ? "14px 16px" : "14px 0",
          borderTop: `1px solid ${C.navyMid}`,
          display: "flex", alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          gap: 10, cursor: "pointer",
          background: active === "account" ? C.navyMid : "transparent",
        }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: C.accent, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.white, fontWeight: 700, fontSize: 13,
        }}>{initial}</div>
        {open && (
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ color: C.white, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Guest"}</div>
            <div style={{ color: "#7B93BE", fontSize: 11, whiteSpace: "nowrap" }}>{user?.role || ""}</div>
          </div>
        )}
        {open && (
          <button
            onClick={(e) => { e.stopPropagation(); onLogout(); }}
            title="Log out"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#7B93BE", fontSize: 16, padding: 4, flexShrink: 0,
            }}
          >
            ⏏
          </button>
        )}
      </div>
    </div>
  );
}
