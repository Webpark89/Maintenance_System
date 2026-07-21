import { addDays, format, isSaturday, isSunday, parseISO } from "date-fns";

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// รายการวันหยุดนักขัตฤกษ์ประจำปี (ตัวอย่างวันหยุดมาตรฐานประเทศไทย)
export const DEFAULT_HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่" },
  { date: "2026-03-03", name: "วันมาฆบูชา" },
  { date: "2026-04-06", name: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกฯ" },
  { date: "2026-04-13", name: "วันสงกรานต์" },
  { date: "2026-04-14", name: "วันสงกรานต์" },
  { date: "2026-04-15", name: "วันสงกรานต์" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ" },
  { date: "2026-05-04", name: "วันฉัตรมงคล" },
  { date: "2026-05-31", name: "วันวิสาขบูชา" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว" },
  { date: "2026-07-29", name: "วันอาสาฬหบูชา" },
  { date: "2026-07-30", name: "วันเข้าพรรษา" },
  { date: "2026-08-12", name: "วันแม่แห่งชาติ" },
  { date: "2026-10-13", name: "วันคล้ายวันสวรรคต พระบาทสมเด็จพระบรมชนกาธิเบศร" },
  { date: "2026-10-23", name: "วันปิยมหาราช" },
  { date: "2026-12-05", name: "วันพ่อแห่งชาติ" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ" },
  { date: "2026-12-31", name: "วันสิ้นปี" },
];

export interface RepairDurationResult {
  totalCalendarDays: number;
  workingDays: number;
  holidaysCount: number;
  weekendDaysCount: number;
  holidayNames: string[];
}

/**
 * คำนวณวันทำงานจริง (Working Days) โดยหักวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์
 */
export function calculateRepairDuration(
  startDateStr: string,
  endDateStr: string,
  holidays: Holiday[] = DEFAULT_HOLIDAYS,
  includeWeekends: boolean = false
): RepairDurationResult {
  if (!startDateStr || !endDateStr) {
    return {
      totalCalendarDays: 0,
      workingDays: 0,
      holidaysCount: 0,
      weekendDaysCount: 0,
      holidayNames: [],
    };
  }

  const start = parseISO(startDateStr.slice(0, 10));
  const end = parseISO(endDateStr.slice(0, 10));

  if (start > end) {
    return {
      totalCalendarDays: 0,
      workingDays: 0,
      holidaysCount: 0,
      weekendDaysCount: 0,
      holidayNames: [],
    };
  }

  const holidayMap = new Map<string, string>();
  holidays.forEach((h) => holidayMap.set(h.date, h.name));

  let totalDays = 0;
  let workingDays = 0;
  let weekendCount = 0;
  let holidayCount = 0;
  const holidayNames: string[] = [];

  let current = new Date(start.getTime());

  while (current <= end) {
    totalDays++;
    const formattedDate = format(current, "yyyy-MM-dd");
    const isWeekend = isSaturday(current) || isSunday(current);
    const holidayName = holidayMap.get(formattedDate);

    if (isWeekend) {
      weekendCount++;
      if (includeWeekends && !holidayName) {
        workingDays++;
      }
    } else if (holidayName) {
      holidayCount++;
      holidayNames.push(`${holidayName} (${formattedDate})`);
    } else {
      workingDays++;
    }

    current = addDays(current, 1);
  }

  return {
    totalCalendarDays: totalDays,
    workingDays,
    holidaysCount: holidayCount,
    weekendDaysCount: weekendCount,
    holidayNames,
  };
}
