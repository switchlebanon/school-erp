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
import MyAccount from "./pages/MyAccount";
import ManageUsers from "./pages/ManageUsers";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import Expenses from "./pages/Expenses";
import { canAccess } from "./permissions";
import InstallPrompt from "./components/InstallPrompt";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

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
    account:       <MyAccount onNav={setPage} />,
    users:         <ManageUsers />,
    employees:     <Employees />,
    payroll:       <Payroll />,
    expenses:      <Expenses />,
  };

  // Guard: if the current page isn't allowed for this role, fall back to dashboard
  const activePage = canAccess(user.role, page) ? page : "dashboard";

  return (
    <>
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.slateL, overflow: "hidden" }}>
        <Sidebar
          active={activePage}
          onNav={setPage}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          user={user}
          onLogout={logout}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Topbar page={activePage} user={user} />
          <main style={{ flex: 1, overflowY: "auto", padding: window.innerWidth > 768 ? "22px 24px" : "14px 12px" }}>
            {pages[activePage]}
          </main>
        </div>
      </div>
      <InstallPrompt />
    </>
  );
}
