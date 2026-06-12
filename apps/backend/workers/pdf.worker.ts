import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { prisma, ImportStatus } from "@repo/db/client";
import { PdfParserService } from "../services/pdf-parser.service";
import { invalidateAnalyticsCache } from "../services/analytics.service";
import fs from "fs";

export const pdfWorker = new Worker(
  "pdf-ingestion",
  async (job: Job) => {
    console.log("PDF worker picked up job:", job.id);
    const { importJobId, filePath } = job.data;
    let created = 0;
    let matched = 0;
    const errorLog: { row: string; reason: string }[] = [];

    try {

      await prisma.importJob.update({
        where: { id: importJobId },
        data: { status: ImportStatus.PARSING },
      });

      const parsedTimetables = await PdfParserService.parseTimetable(filePath);



      await prisma.importJob.update({
        where: { id: importJobId },
        data: { status: ImportStatus.INTEGRATING },
      });

      for (const parsedData of parsedTimetables) {
        // ── A. Department
        let department = await prisma.department.findUnique({
          where: { code: parsedData.departmentCode },
        });
        if (!department) {
          department = await prisma.department.create({
            data: {
              code: parsedData.departmentCode,
              name: parsedData.departmentName || parsedData.departmentCode,
            },
          });
          created++;
        } else {
          matched++;
        }

        // B. Branch
        let branch = null;
        if (parsedData.branchName) {
          branch = await prisma.branch.findUnique({
            where: {
              name_departmentId: {
                name: parsedData.branchName,
                departmentId: department.id,
              },
            },
          });
          if (!branch) {
            branch = await prisma.branch.create({
              data: {
                name: parsedData.branchName,
                departmentId: department.id,
              },
            });
            created++;
          } else {
            matched++;
          }
        }

        // C. Section
        let sectionId: string | null = null;
        if (branch && parsedData.semester && parsedData.sectionName) {
          let section = await prisma.section.findUnique({
            where: {
              name_semester_branchId: {
                name: parsedData.sectionName,
                semester: parsedData.semester,
                branchId: branch.id,
              },
            },
          });
          if (!section) {
            section = await prisma.section.create({
              data: {
                name: parsedData.sectionName,
                semester: parsedData.semester,
                branchId: branch.id,
              },
            });
            created++;
          } else {
            matched++;
          }
          sectionId = section.id;
        }

        // D. Slots
        for (const slotData of parsedData.slots) {
          try {
            // Room
            let room = await prisma.room.findUnique({
              where: {
                number_departmentId: {
                  number: slotData.roomNumber,
                  departmentId: department.id,
                },
              },
            });
            if (!room) {
              room = await prisma.room.create({
                data: {
                  number: slotData.roomNumber,
                  departmentId: department.id,
                  type: slotData.roomNumber.toLowerCase().includes("lab")
                    ? "LAB"
                    : "CLASSROOM",
                  capacity: null,
                },
              });
              created++;
            } else {
              matched++;
            }

            // Course

            const courseMeta = parsedData.courseMetadata?.find(
              (c: { code: string; credits: number; name: string }) =>
                c.code === slotData.courseCode,
            );

            const credits = courseMeta?.credits ?? 3;

            let course = await prisma.course.findFirst({
              where: {
                code: slotData.courseCode,
                branch: { departmentId: department.id },
              },
            });
            if (!course && branch) {
              course = await prisma.course.create({
                data: {
                  code: slotData.courseCode,
                  name: slotData.courseCode,
                  credits: credits,
                  requiredContactHours: credits * 1,
                  type: slotData.courseCode.includes("LAB") ? "LAB" : "LECTURE",
                  semester: parsedData.semester ?? 1,
                  branchId: branch.id,
                },
              });
              created++;
            } else if (course) {
              matched++;
            }

            // Slot 
            if (course && room && sectionId) {
              const slot = await prisma.slot.upsert({
                where: {

                  day_period_sectionId: {
                    day: slotData.day,
                    period: slotData.period,
                    sectionId: sectionId,
                  },
                },
                update: { courseId: course.id, roomId: room.id },
                create: {
                  day: slotData.day,
                  period: slotData.period,
                  sectionId: sectionId,
                  courseId: course.id,
                  roomId: room.id,
                },
              });

              // Faculty
              const facultyName = parsedData.facultyMap[slotData.courseCode];
              if (facultyName) {
                let faculty = await prisma.faculty.findFirst({
                  where: {
                    name: { contains: facultyName, mode: "insensitive" },
                    departmentId: department.id,
                  },
                });
                if (!faculty) {
                  faculty = await prisma.faculty.create({
                    data: { name: facultyName, departmentId: department.id },
                  });
                  created++;
                } else {
                  matched++;
                }

                await prisma.slotFaculty.upsert({
                  where: {
                    slotId_facultyId: {
                      slotId: slot.id,
                      facultyId: faculty.id,
                    },
                  },
                  update: {},
                  create: { slotId: slot.id, facultyId: faculty.id },
                });
              }

              created++;
            }
          } catch (slotErr: any) {
            errorLog.push({
              row: `${slotData.day} P${slotData.period} ${slotData.courseCode}`,
              reason: slotErr.message,
            });
          }
        }
      }
      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: ImportStatus.DONE,
          created,
          matched,
          failed: errorLog.length,
          errorLog: errorLog as any,
        },
      });


      invalidateAnalyticsCache();
      console.log(
        `Job ${job.id} done — created: ${created}, matched: ${matched}, failed: ${errorLog.length}`,
      );
    } catch (error: any) {
      console.error(` Job ${job.id} fatal error:`, error.message);
      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: ImportStatus.FAILED,
          errorLog: [{ reason: "Fatal error", details: error.message }] as any,
        },
      });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  },
  { connection: redis as any },
);

pdfWorker.on("completed", (job) => console.log(`PDF job ${job.id} completed`));
pdfWorker.on("failed", (job, err) =>
  console.error(`PDF job ${job?.id} failed:`, err.message),
);
