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

const isMobile = () => window.innerWidth < 768;

export default function App() {
  const { user, loading, logout } = useAuth();

  const defaultPage = (role) => {
    if (role === "TEACHER")  return "students";
    if (role === "PARENT")   return "fees";
    if (role === "STUDENT")  return "grades";
    if (role === "EMPLOYEE") return "payroll";
    return "dashboard";
  };

  const [page, setPage] = useState("dashboard");
  // On mobile: sidebar starts closed. On desktop: starts open.
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());

  // Close sidebar on mobile when navigating to a new page
  const handleNav = (p) => {
    setPage(p);
    if (isMobile()) setSidebarOpen(false);
  };

  // Listen for navigation events from Dashboard quick actions
  useEffect(() => {
    const handler = (e) => handleNav(e.detail);
    window.addEventListener("s3-nav", handler);
    return () => window.removeEventListener("s3-nav", handler);
  }, []);

  // On window resize: auto-open sidebar when going to desktop, close when going mobile
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  if (!user) return <Login />;

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

  const activePage = canAccess(user.role, page) ? page : defaultPage(user.role);
  const mobile = isMobile();

  return (
    <>
      <div style={{
        display: "flex", height: "100vh",
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: C.slateL, overflow: "hidden",
        position: "relative",
      }}>

        {/* Mobile backdrop — tap to close sidebar */}
        {mobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
              zIndex: 99, backdropFilter: "blur(1px)",
            }}
          />
        )}

        {/* Sidebar — fixed overlay on mobile, normal flow on desktop */}
        <div style={{
          ...(mobile ? {
            position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
          } : {}),
          flexShrink: 0,
        }}>
          <Sidebar
            active={activePage}
            onNav={handleNav}
            open={mobile ? true : sidebarOpen}
            onToggle={() => setSidebarOpen(o => !o)}
            user={user}
            onLogout={logout}
            mobile={mobile}
          />
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Topbar
            page={activePage}
            user={user}
            onMenuToggle={() => setSidebarOpen(o => !o)}
            sidebarOpen={sidebarOpen}
          />
          <main style={{
            flex: 1, overflowY: "auto",
            padding: mobile ? "14px 12px" : "22px 24px",
          }}>
            {pages[activePage]}
          </main>
        </div>
      </div>
      <InstallPrompt />
    </>
  );
}
