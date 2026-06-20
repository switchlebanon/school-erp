import { useState, useEffect } from "react";
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
import Classes from "./pages/Classes";
import { canAccess } from "./permissions";
import InstallPrompt from "./components/InstallPrompt";

export default function App() {
  const { user, loading, logout } = useAuth();

  // Default landing page per role
  const defaultPage = (role) => {
    if (role === "TEACHER")  return "students";
    if (role === "PARENT")   return "fees";
    if (role === "STUDENT")  return "grades";
    if (role === "EMPLOYEE") return "payroll";
    return "dashboard"; // ADMIN
  };

  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  // Listen for navigation events from Dashboard quick actions
  useEffect(() => {
    const handler = (e) => setPage(e.detail);
    window.addEventListener("s3-nav", handler);
    return () => window.removeEventListener("s3-nav", handler);
  }, []);

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
    classes:       <Classes />,
  };

  // Guard: if the current page isn't allowed for this role, fall back to role's default page
  const activePage = canAccess(user.role, page) ? page : defaultPage(user.role);

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
