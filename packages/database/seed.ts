import { RoomType, CourseType, Role , ImportStatus } from "./generated/prisma/client"
import { prisma } from "./index";
import bcrypt from "bcrypt";



async function main() {
  console.log("🗑️  Clearing existing data...");

  // Delete in dependency order
  await prisma.slotFaculty.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.course.deleteMany();
  await prisma.section.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.room.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.importJob.deleteMany();

  console.log("✅ All data cleared.\n");

  // ── 1. ADMIN USER ──────────────────────────────────────────────────────────
  console.log("👤 Creating admin user...");
  const passwordHash = await bcrypt.hash("SamayakUser@2026", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Samayak Admin",
      email: "admin@samayak.in",
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ── 2. DEPARTMENT & ACADEMIC STRUCTURE ─────────────────────────────────────
  console.log("🏫 Creating Department/Branch/Section...");
  
  const dept = await prisma.department.create({
    data: {
      code: "CSE",
      name: "Computer Science and Engineering",
    },
  });

  const branch = await prisma.branch.create({
    data: {
      name: "CS",
      departmentId: dept.id,
    },
  });

  const section = await prisma.section.create({
    data: {
      name: "A",
      semester: 6,
      branchId: branch.id,
    },
  });

  // ── 3. FACULTY ─────────────────────────────────────────────────────────────
  console.log("👨‍🏫 Creating Faculty and Professor User...");
  
  // Create a user for the professor
  const profUser = await prisma.user.create({
    data: {
      name: "Dr. Supratim Biswas",
      email: "supratim@bitmesra.ac.in",
      passwordHash,
      role: Role.PROFESSOR,
      departmentId: dept.id,
    },
  });

  // Sync faculty record (manually creating as per your sync logic)
  await prisma.faculty.create({
    data: {
      name: "Dr. Supratim Biswas",
      email: "supratim@bitmesra.ac.in",
      departmentId: dept.id,
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());