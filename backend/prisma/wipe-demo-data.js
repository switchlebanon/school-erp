/**
 * Wipes demo/seed data (students, teachers, employees, their linked
 * accounts, and all transactional records) while preserving:
 *   - GradeLevel / Section / Subject  (structural data — the CSV import
 *     needs these to already exist, matched by "Grade X" + section letter)
 *   - Any User with role ADMIN        (so you never get locked out,
 *     whatever email your real admin account uses)
 *
 * Run this from wherever DATABASE_URL points at the database you want
 * to clear. Easiest: Render dashboard -> your backend service -> Shell tab
 * (it already has the production DATABASE_URL loaded), then:
 *
 *   node prisma/wipe-demo-data.js
 *
 * To preview what would be deleted without touching anything, run:
 *
 *   node prisma/wipe-demo-data.js --dry-run
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dryRun = process.argv.includes("--dry-run");

// Children first, then parents, to respect foreign keys.
const steps = [
  ["payments",         prisma.payment,        {}],
  ["feeInvoices",      prisma.feeInvoice,     {}],
  ["gradeRecords",     prisma.gradeRecord,    {}],
  ["attendance",       prisma.attendance,     {}],
  ["timetableEntries", prisma.timetableEntry, {}],
  ["salaryPayments",   prisma.salaryPayment,  {}],
  ["teacherSubjects",  prisma.teacherSubject, {}],
  ["announcements",    prisma.announcement,   {}],
  ["expenses",         prisma.expense,        {}],
  ["students",         prisma.student,        {}],
  ["teachers",         prisma.teacher,        {}],
  ["employees",        prisma.employee,       {}],
  // Keep ADMIN users no matter what email they use.
  ["non-admin users",  prisma.user,           { role: { not: "ADMIN" } }],
];

async function main() {
  console.log(dryRun ? "🔍 Dry run — nothing will be deleted.\n" : "🧹 Wiping demo data...\n");

  for (const [label, model, where] of steps) {
    if (dryRun) {
      const n = await model.count({ where });
      console.log(`  would delete ${n.toString().padStart(4)}  ${label}`);
    } else {
      const { count } = await model.deleteMany({ where });
      console.log(`  deleted       ${count.toString().padStart(4)}  ${label}`);
    }
  }

  const remainingAdmins   = await prisma.user.count({ where: { role: "ADMIN" } });
  const remainingSections = await prisma.section.count();
  const remainingSubjects = await prisma.subject.count();

  console.log(`\n${dryRun ? "Preview" : "✅ Done"}.`);
  console.log(`   Admin accounts ${dryRun ? "currently" : "preserved"}: ${remainingAdmins}`);
  console.log(`   Sections kept (for import matching): ${remainingSections}`);
  console.log(`   Subjects kept: ${remainingSubjects}`);

  if (!dryRun && remainingAdmins === 0) {
    console.log("\n⚠️  WARNING: no ADMIN-role users remain. You will not be able to log in.");
    console.log("   Restore from a backup before doing anything else.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
