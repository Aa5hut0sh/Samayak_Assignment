import { prisma } from "@repo/db/client";

const WORKING_DAYS = 5;
const PERIODS_PER_DAY = 9;
const TOTAL_SLOTS_PER_WEEK = WORKING_DAYS * PERIODS_PER_DAY;


let cachedMetrics: any = null;
let cacheKey: string | null = null;

export const invalidateAnalyticsCache = () => {
  cachedMetrics = null;
  cacheKey = null;
  console.log("🔄 Analytics cache invalidated");
};


const _getDashboardMetrics = async (departmentId?: string) => {
  const roomWhere = { deletedAt: null, ...(departmentId && { departmentId }) };
  const courseWhere = {
    deletedAt: null,
    ...(departmentId && { branch: { departmentId } }),
  };
  const slotWhere = { room: roomWhere, course: courseWhere };

  const [totalRooms, activeRooms, courses, allSlots] = await Promise.all([
    prisma.room.count({ where: roomWhere }),
    prisma.room.findMany({ where: roomWhere, select: { id: true, number: true } }),
    prisma.course.findMany({
      where: courseWhere,
      include: { _count: { select: { slots: true } } },
    }),
    prisma.slot.findMany({
      where: slotWhere,
      select: { day: true, period: true, roomId: true, courseId: true },
    }),
  ]);

  if (totalRooms === 0) {
    return {
      roomUtilisation: { overallPercentage: 0, perRoom: [] },
      recoveryProbability: { periods: {} },
      underRunningCourses: { count: 0, courses: [] },
      avgEmptyRoomHoursPerDay: 0,
    };
  }

  // Metric 1
  const overallAvailableSlots = totalRooms * TOTAL_SLOTS_PER_WEEK;
  const overallOccupiedSlots  = allSlots.length;
  const overallUtilisation    = parseFloat(
    ((overallOccupiedSlots / overallAvailableSlots) * 100).toFixed(2)
  );

  const roomUtilisationMap: Record<string, { roomNumber: string; occupied: number; total: number; percentage: number }> = {};
  activeRooms.forEach(r => {
    roomUtilisationMap[r.id] = { roomNumber: r.number, occupied: 0, total: TOTAL_SLOTS_PER_WEEK, percentage: 0 };
  });
  allSlots.forEach(slot => {
    const s = roomUtilisationMap[slot.roomId];
    if (s) s.occupied++;
  });
  Object.values(roomUtilisationMap).forEach(ru => {
    ru.percentage = parseFloat(((ru.occupied / ru.total) * 100).toFixed(2));
  });

  // Metric 2
  const slotsByPeriod: Record<number, Set<string>> = {};
  allSlots.forEach(slot => {
    if (!slotsByPeriod[slot.period]) slotsByPeriod[slot.period] = new Set();
    slotsByPeriod[slot.period]!.add(`${slot.day}-${slot.roomId}`);
  });
  const probabilityPerPeriod: Record<number, number> = {};
  for (let period = 1; period <= PERIODS_PER_DAY; period++) {
    const occupiedCount = (slotsByPeriod[period]?.size ?? 0) / WORKING_DAYS;
    probabilityPerPeriod[period] = parseFloat(
      ((totalRooms - occupiedCount) / totalRooms).toFixed(2)
    );
  }

  // Metric 3
  const underRunningCourses = courses
    .filter(c => !c.isZeroCredit && c._count.slots < c.requiredContactHours)
    .map(c => ({
      id: c.id, code: c.code, name: c.name,
      scheduled: c._count.slots,
      required:  c.requiredContactHours,
      gap:       c.requiredContactHours - c._count.slots,
    }));

  // Metric 4
  const totalEmptySlots       = overallAvailableSlots - overallOccupiedSlots;
  const avgEmptyRoomHoursPerDay = parseFloat(
    ((totalEmptySlots / WORKING_DAYS) / totalRooms).toFixed(2)
  );

  return {
    roomUtilisation: {
      overallPercentage: overallUtilisation,
      perRoom: Object.values(roomUtilisationMap).sort((a, b) => b.percentage - a.percentage),
    },
    recoveryProbability: { periods: probabilityPerPeriod },
    underRunningCourses: { count: underRunningCourses.length, courses: underRunningCourses },
    avgEmptyRoomHoursPerDay,
  };
};


export const getDashboardMetrics = async (departmentId?: string) => {
  const key = departmentId ?? "__all__";
  if (cachedMetrics && cacheKey === key) return cachedMetrics;
  const result = await _getDashboardMetrics(departmentId);
  cachedMetrics = result;
  cacheKey = key;
  return result;
};