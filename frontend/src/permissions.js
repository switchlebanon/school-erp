// ─── Role-Based Page Access ────────────────────────────────────────
// Defines which pages each role can see/access.
// Used by Sidebar (to filter nav items) and App.jsx (to block direct access).

export const ROLES = {
  ADMIN:   "ADMIN",
  TEACHER: "TEACHER",
  PARENT:  "PARENT",
  STUDENT: "STUDENT",
  EMPLOYEE: "EMPLOYEE",
};

// Pages every authenticated user can access regardless of role
const ALWAYS_ALLOWED = ["account"];

// Per-role page access lists.
// "ALL" means every page is accessible (used for Admin).
export const ROLE_PAGES = {
  ADMIN: "ALL",

  TEACHER: [
    "dashboard",
    "students",
    "attendance",
    "timetable",
    "grades",
    "announcements",
  ],

  PARENT: [
    "dashboard",
    "fees",
    "announcements",
    "grades",       // read-only view of their child's grades
    "attendance",   // read-only view of their child's attendance
  ],

  STUDENT: [
    "dashboard",
    "timetable",
    "grades",
    "announcements",
  ],

  EMPLOYEE: [
    "dashboard",
    "announcements",
  ],
};

// All page IDs that exist in the app (used when role === "ALL")
export const ALL_PAGES = [
  "dashboard", "students", "teachers", "attendance", "timetable",
  "grades", "fees", "announcements", "users", "employees", "payroll", "expenses",
];

/**
 * Returns true if the given role can access the given page.
 */
export function canAccess(role, pageId) {
  if (ALWAYS_ALLOWED.includes(pageId)) return true;

  const allowed = ROLE_PAGES[role];
  if (allowed === "ALL") return true;
  if (!allowed) return false;

  return allowed.includes(pageId);
}

/**
 * Returns the list of page IDs a role can access (expands "ALL").
 */
export function getAccessiblePages(role) {
  const allowed = ROLE_PAGES[role];
  if (allowed === "ALL") return [...ALL_PAGES, ...ALWAYS_ALLOWED];
  if (!allowed) return [...ALWAYS_ALLOWED];
  return [...allowed, ...ALWAYS_ALLOWED];
}
