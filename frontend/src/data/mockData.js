import { C } from "../theme";

// ─── Mock Data (used until each module is wired to the API) ──────

export const teachers = [
  { id: 1, name: "Ms. Rana Aoun",    subject: "Mathematics", sections: "9A, 10B, 11C", status: "Active" },
  { id: 2, name: "Mr. Elie Khoury",  subject: "Physics",     sections: "10A, 11B",     status: "Active" },
  { id: 3, name: "Ms. Sara Gemayel", subject: "English",     sections: "8A, 9B, 12A",  status: "Active" },
  { id: 4, name: "Mr. Ziad Rahme",   subject: "History",     sections: "9A, 10C",      status: "On Leave" },
];

export const attendanceData = [
  { day: "Mon", present: 142, absent: 8 },
  { day: "Tue", present: 138, absent: 12 },
  { day: "Wed", present: 145, absent: 5 },
  { day: "Thu", present: 140, absent: 10 },
  { day: "Fri", present: 130, absent: 20 },
];

export const feeData = [
  { month: "Sep", collected: 18500, pending: 3200 },
  { month: "Oct", collected: 21000, pending: 1800 },
  { month: "Nov", collected: 19800, pending: 2400 },
  { month: "Dec", collected: 22500, pending: 900 },
  { month: "Jan", collected: 20100, pending: 2100 },
];

export const gradeDistribution = [
  { name: "A (90-100)", value: 38, color: C.green },
  { name: "B (80-89)",  value: 45, color: C.accent },
  { name: "C (70-79)",  value: 25, color: C.amber },
  { name: "D (60-69)",  value: 10, color: C.red },
];

export const announcements = [
  { id: 1, title: "Mid-term exams schedule published",       date: "Jun 10", type: "Academic", priority: "high" },
  { id: 2, title: "Parent-Teacher meeting – Jun 20",         date: "Jun 9",  type: "Event",    priority: "medium" },
  { id: 3, title: "Library books due for return by Jun 15",  date: "Jun 8",  type: "Admin",    priority: "low" },
  { id: 4, title: "Sports Day registration open",            date: "Jun 7",  type: "Event",    priority: "low" },
];

export const timetable = {
  "Grade 9A": [
    { time: "7:30–8:15",   Mon: "Math",    Tue: "English", Wed: "Physics", Thu: "Math",    Fri: "History" },
    { time: "8:15–9:00",   Mon: "English", Tue: "Physics", Wed: "Math",    Thu: "English", Fri: "Math" },
    { time: "9:00–9:45",   Mon: "Physics", Tue: "History", Wed: "English", Thu: "Physics", Fri: "English" },
    { time: "10:00–10:45", Mon: "History", Tue: "Math",    Wed: "History", Thu: "History", Fri: "Physics" },
    { time: "10:45–11:30", Mon: "PE",      Tue: "Art",     Wed: "PE",      Thu: "Art",     Fri: "Free" },
  ],
};

export const subjectColors = {
  Math: C.accent, English: C.green, Physics: C.amber,
  History: C.purple, PE: C.red, Art: "#EC4899", Free: C.border,
};

// Fallback students used only by Dashboard widgets (attendance chart etc.)
// until those modules are wired to the API too.
export const mockStudents = [
  { id: 1, name: "Lara Khalil",   grade: "Grade 9",  section: "A", gpa: 3.8, status: "Active",   fees: "Paid",    guardian: "Hassan Khalil" },
  { id: 2, name: "Omar Nassar",   grade: "Grade 10", section: "B", gpa: 3.2, status: "Active",   fees: "Pending", guardian: "Rania Nassar" },
  { id: 3, name: "Nadia Haddad",  grade: "Grade 8",  section: "A", gpa: 3.9, status: "Active",   fees: "Paid",    guardian: "Samir Haddad" },
  { id: 4, name: "Karim Saleh",   grade: "Grade 11", section: "C", gpa: 2.7, status: "Active",   fees: "Overdue", guardian: "Maya Saleh" },
  { id: 5, name: "Dina Farah",    grade: "Grade 9",  section: "B", gpa: 3.5, status: "Active",   fees: "Paid",    guardian: "Jad Farah" },
  { id: 6, name: "Tarek Mansour", grade: "Grade 12", section: "A", gpa: 3.1, status: "Inactive", fees: "Paid",    guardian: "Leila Mansour" },
];
