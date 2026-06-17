const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin user ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@scube.test" },
    update: {},
    create: {
      email: "admin@scube.test",
      password: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  // ── Grade levels & sections ─────────────────────────────────
  const gradeNames = [8, 9, 10, 11, 12];
  const gradeLevels = {};
  for (const num of gradeNames) {
    gradeLevels[num] = await prisma.gradeLevel.upsert({
      where: { name: `Grade ${num}` },
      update: {},
      create: { name: `Grade ${num}`, order: num },
    });
  }

  const sectionLetters = ["A", "B", "C"];
  const sections = {};
  for (const num of gradeNames) {
    for (const letter of sectionLetters) {
      const key = `${num}${letter}`;
      sections[key] = await prisma.section.upsert({
        where: { gradeLevelId_name: { gradeLevelId: gradeLevels[num].id, name: letter } },
        update: {},
        create: { name: letter, gradeLevelId: gradeLevels[num].id },
      });
    }
  }

  // ── Subjects ─────────────────────────────────────────────────
  const subjectDefs = [
    { name: "Mathematics",  code: "MATH101", color: "#3D7EFF" },
    { name: "English",      code: "ENG101",  color: "#22C55E" },
    { name: "Arabic",       code: "ARA101",  color: "#0EA5E9" },
    { name: "French",       code: "FRE101",  color: "#6366F1" },
    { name: "Physics",      code: "PHY101",  color: "#F59E0B" },
    { name: "Chemistry",    code: "CHM101",  color: "#14B8A6" },
    { name: "Biology",      code: "BIO101",  color: "#84CC16" },
    { name: "History",      code: "HIS101",  color: "#A855F7" },
    { name: "Geography",    code: "GEO101",  color: "#06B6D4" },
    { name: "Computer Science", code: "CS101", color: "#64748B" },
    { name: "PE",           code: "PE101",   color: "#EF4444" },
    { name: "Art",          code: "ART101",  color: "#EC4899" },
    { name: "Music",        code: "MUS101",  color: "#F97316" },
    { name: "Religion",     code: "REL101",  color: "#8B5CF6" },
  ];
  const subjects = {};
  for (const def of subjectDefs) {
    subjects[def.name] = await prisma.subject.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
  }

  // ── Teachers ─────────────────────────────────────────────────
  const teacherDefs = [
    { name: "Rana Aoun", email: "rana.aoun@scube.test", subject: "Mathematics" },
    { name: "Elie Khoury", email: "elie.khoury@scube.test", subject: "Physics" },
    { name: "Sara Gemayel", email: "sara.gemayel@scube.test", subject: "English" },
    { name: "Ziad Rahme", email: "ziad.rahme@scube.test", subject: "History", status: "ON_LEAVE" },
  ];
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  for (const def of teacherDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        password: teacherPassword,
        name: `Ms./Mr. ${def.name}`,
        role: "TEACHER",
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        status: def.status || "ACTIVE",
      },
    });

    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subjects[def.subject].id } },
      update: {},
      create: { teacherId: teacher.id, subjectId: subjects[def.subject].id },
    });
  }

  // ── Students (matching frontend mock data) ─────────────────
  const studentDefs = [
    { code: "STU-2026-001", name: "Lara Khalil",   section: "9A",  status: "ACTIVE",   guardianName: "Hassan Khalil",   guardianPhone: "+96171234501" },
    { code: "STU-2026-002", name: "Omar Nassar",   section: "10B", status: "ACTIVE",   guardianName: "Rania Nassar",    guardianPhone: "+96170234502" },
    { code: "STU-2026-003", name: "Nadia Haddad",  section: "8A",  status: "ACTIVE",   guardianName: "Samir Haddad",   guardianPhone: "+96176234503" },
    { code: "STU-2026-004", name: "Karim Saleh",   section: "11C", status: "ACTIVE",   guardianName: "Maya Saleh",     guardianPhone: "+96178234504" },
    { code: "STU-2026-005", name: "Dina Farah",    section: "9B",  status: "ACTIVE",   guardianName: "Jad Farah",      guardianPhone: "+96181234505" },
    { code: "STU-2026-006", name: "Tarek Mansour", section: "12A", status: "INACTIVE", guardianName: "Leila Mansour",  guardianPhone: "+96179234506" },
  ];

  for (const def of studentDefs) {
    await prisma.student.upsert({
      where: { studentCode: def.code },
      update: { guardianName: def.guardianName, guardianPhone: def.guardianPhone },
      create: {
        studentCode:   def.code,
        name:          def.name,
        sectionId:     sections[def.section].id,
        status:        def.status,
        guardianName:  def.guardianName,
        guardianPhone: def.guardianPhone,
      },
    });
  }

  // ── Sample announcements ────────────────────────────────────
  const announcementDefs = [
    { title: "Mid-term exams schedule published", type: "ACADEMIC", priority: "HIGH" },
    { title: "Parent-Teacher meeting – Jun 20", type: "EVENT", priority: "MEDIUM" },
    { title: "Library books due for return by Jun 15", type: "ADMIN", priority: "LOW" },
    { title: "Sports Day registration open", type: "EVENT", priority: "LOW" },
  ];
  for (const def of announcementDefs) {
    await prisma.announcement.create({
      data: { ...def, authorId: admin.id },
    });
  }

  // ── Sample fee invoices with installment payments ───────────
  const allStudents = await prisma.student.findMany();

  for (const student of allStudents) {
    // Term 1 Tuition — fully paid in 2 installments
    const inv1 = await prisma.feeInvoice.create({
      data: {
        studentId:   student.id,
        description: "Term 1 Tuition",
        amount:      1800,
        dueDate:     new Date("2025-10-01"),
        status:      "PAID",
        totalPaid:   1800,
      },
    });
    await prisma.payment.createMany({ data: [
      { invoiceId: inv1.id, amount: 900, paidDate: new Date("2025-09-05"), note: "Cash - 1st installment" },
      { invoiceId: inv1.id, amount: 900, paidDate: new Date("2025-10-01"), note: "Cash - 2nd installment" },
    ]});

    // Term 2 Tuition — partially paid (1 of 2 installments done)
    const inv2 = await prisma.feeInvoice.create({
      data: {
        studentId:   student.id,
        description: "Term 2 Tuition",
        amount:      1800,
        dueDate:     new Date("2026-02-01"),
        status:      "PENDING",
        totalPaid:   900,
      },
    });
    await prisma.payment.create({
      data: { invoiceId: inv2.id, amount: 900, paidDate: new Date("2026-01-10"), note: "Bank transfer - 1st installment" },
    });

    // Term 3 Tuition — not yet paid
    await prisma.feeInvoice.create({
      data: {
        studentId:   student.id,
        description: "Term 3 Tuition",
        amount:      1800,
        dueDate:     new Date("2026-06-01"),
        status:      "OVERDUE",
        totalPaid:   0,
      },
    });

    // Activity Fee — paid in full
    const inv4 = await prisma.feeInvoice.create({
      data: {
        studentId:   student.id,
        description: "Activity Fee",
        amount:      150,
        dueDate:     new Date("2025-09-15"),
        status:      "PAID",
        totalPaid:   150,
      },
    });
    await prisma.payment.create({
      data: { invoiceId: inv4.id, amount: 150, paidDate: new Date("2025-09-12"), note: "Cash" },
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Admin login: admin@scube.test / admin123");
  console.log("   Teacher login (any): rana.aoun@scube.test / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
