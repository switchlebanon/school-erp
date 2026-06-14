import { useState } from "react";
import { C } from "./theme";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Attendance from "./pages/Attendance";
import Timetable from "./pages/Timetable";
import Grades from "./pages/Grades";
import Fees from "./pages/Fees";
import Announcements from "./pages/Announcements";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Still checking for a stored token on first load
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: C.slateL, fontFamily: "'Inter', -apple-system, sans-serif", color: C.slate, fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in -> show login page
  if (!user) {
    return <Login />;
  }

  const pages = {
    dashboard:     <Dashboard user={user} />,
    students:      <Students />,
    teachers:      <Teachers />,
    attendance:    <Attendance />,
    timetable:     <Timetable />,
    grades:        <Grades />,
    fees:          <Fees />,
    announcements: <Announcements />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.slateL, overflow: "hidden" }}>
      <Sidebar
        active={page}
        onNav={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        user={user}
        onLogout={logout}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar page={page} user={user} />
        <main style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {pages[page]}
        </main>
      </div>
    </div>
  );
}
