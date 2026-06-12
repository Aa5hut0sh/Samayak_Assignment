import { z } from "zod";
import OpenAI from "openai";
import { pdf } from "pdf-to-img";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});


const SlotSchema = z.object({
  day: z.string(),
  period: z.number(),
  courseCode: z.string(), 
  courseAbbr: z.string(), 
  roomNumber: z.string(),
});

const CourseMetaSchema = z.object({
  code: z.string(),
  abbr: z.string(), 
  name: z.string(),
  credits: z.number(),
});

const TimetableSchema = z.object({
  departmentName: z.string().default(""),
  departmentCode: z.string().default(""),
  branchName: z.string().default(""),
  semester: z.number().default(0),
  sectionName: z.string().default(""),
  slots: z.array(SlotSchema).default([]),
  facultyMap: z.record(z.string(), z.string()).default({}),
  courseMetadata: z.array(CourseMetaSchema).default([]),
});

export type ParsedTimetable = z.infer<typeof TimetableSchema>;
export type ParsedSlot = z.infer<typeof SlotSchema>;
export type CourseMeta = z.infer<typeof CourseMetaSchema>;

function normalizeRoom(raw: string): string | null {
  if (!raw) return null;

  const cleaned = raw.trim();


  if (/^G\d(\/G\d)?$/i.test(cleaned)) return null;


  const firstRoom = cleaned.split(/[\/,]/)[0]!.trim();


  const labMatch = firstRoom.match(/^Lab\s*(\d+)$/i);
  if (labMatch) return `Lab ${labMatch[1]}`;


  return firstRoom.replace(/\s+/g, "");
}


async function extractPageWithGroq(
  base64Image: string,
  pageNum: number,
): Promise<Partial<ParsedTimetable>> {
  try {
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are extracting structured data from a BIT Mesra university timetable PDF page.

Return ONLY this exact JSON shape (no extra text, no markdown):
{
  "departmentName": "Computer Science and Engineering",
  "departmentCode": "CSE",
  "branchName": "CS",
  "semester": 6,
  "sectionName": "A",
  "courseMetadata": [
    { "code": "CS333", "abbr": "CD", "name": "Compiler Design", "credits": 4 },
    { "code": "CS335", "abbr": "AIML", "name": "Artificial Intelligence and Machine Learning", "credits": 4 }
  ],
  "slots": [
    { "day": "Monday", "period": 1, "courseCode": "CS333", "courseAbbr": "CD", "roomNumber": "219" }
  ],
  "facultyMap": {
    "CS333": "Prof. Supratim Biswas",
    "CS335": "Dr. Sanchita Paul"
  }
}

CRITICAL RULES:

1. departmentCode: short uppercase code from "Department:" cell — e.g. CSE, ECE, ME, EEE, IT
2. branchName: from "Branch:" cell — e.g. CS, AIML, MCA, M.Tech, AIML
3. semester: integer from "Semester:" cell — e.g. "VI A" → semester=6, sectionName="A"; "IV B" → semester=4, sectionName="B"
4. sectionName: single letter A/B/C/D from the semester cell

5. courseMetadata: extract from the course-teacher table at the BOTTOM of the page.
   - "code": the full course code column e.g. CS333, IT349, MT204, CS24211
   - "abbr": the SHORT abbreviation used in timetable cells e.g. CD, CNS, Col, DBMS, FLAT, OS
   - "name": full course name column
   - "credits": numeric value from Credits column; if "NC" use 0

6. slots: extract from the timetable grid (days as rows, periods as columns).
   - "day": full day name — Monday/Tuesday/Wednesday/Thursday/Friday
   - "period": column index 1-9 left to right. The LUNCH-BREAK column is NOT a period — skip it.
     Columns are: I=1, II=2, III=3, IV=4, V=5, [LUNCH], VI=6, VII=7, VIII=8, IX=9
   - "courseCode": FULL code from courseMetadata matching the abbreviation in the cell.
     e.g. cell says "CD" → find abbr "CD" in courseMetadata → use code "CS333"
     e.g. cell says "AIML" → find abbr "AIML" → use code "CS335"
     If you cannot match, use the abbreviation as-is.
   - "courseAbbr": exactly what is written in the timetable cell e.g. "CD", "AIML (T)", "OE III"
   - "roomNumber": what is in parentheses after the course e.g. "219", "Lab 3", "Lab 6"
     IMPORTANT: 
     - "216 A" → write as "216A" (no space)
     - "Lab3" → write as "Lab 3" (space before number)
     - If two rooms like "219/220" → use only "219"
     - G1, G2, G3, G2/G3 are GROUP identifiers NOT room numbers — use the actual room number nearby, or omit roomNumber

7. facultyMap: keys are FULL course codes (e.g. "CS333"), values are teacher names from the bottom table.
   If multiple teachers for one course (e.g. Group 1 & Group 2), use the first teacher name only.

8. If the page has no timetable (blank or signature page), return empty slots/courseMetadata/facultyMap.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` },
            },
            {
              type: "text",
              text: `Extract all timetable data from page ${pageNum}. Return valid JSON only.`,
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    console.log(`📝 Page ${pageNum} raw (first 400):`, raw.slice(0, 400));

    const parsed = JSON.parse(raw) as Partial<ParsedTimetable>;


    if (parsed.slots) {
      const cleanedSlots: ParsedSlot[] = [];
      for (const slot of parsed.slots) {
        const normalizedRoom = normalizeRoom(slot.roomNumber);
        if (!normalizedRoom) {
          console.warn(
            `⚠️  Page ${pageNum}: skipping slot with group-ID room "${slot.roomNumber}" (${slot.day} P${slot.period} ${slot.courseCode})`,
          );
      
          cleanedSlots.push({ ...slot, roomNumber: "UNKNOWN" });
          continue;
        }
        cleanedSlots.push({ ...slot, roomNumber: normalizedRoom });
      }
      parsed.slots = cleanedSlots;
    }

    return parsed;
  } catch (err: any) {
    console.warn(`Page ${pageNum} Groq call failed:`, err.message);
    return { slots: [], facultyMap: {}, courseMetadata: [] };
  }
}


function buildAbbrMap(allMeta: CourseMeta[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of allMeta) {
    if (m.abbr && m.code) {

      map[m.abbr.trim().toUpperCase()] = m.code.trim();
    }
  }
  return map;
}


function resolveCourseCodes(
  slots: ParsedSlot[],
  abbrMap: Record<string, string>,
): ParsedSlot[] {
  return slots.map((slot) => {

    const upperCode = slot.courseCode.trim().toUpperCase();
    const resolved = abbrMap[upperCode];
    if (resolved) {
      return { ...slot, courseCode: resolved };
    }
   
    if (slot.courseAbbr) {
      const upperAbbr = slot.courseAbbr
        .replace(/\s*\(T\)/i, "") 
        .replace(/\s*\(G\d\)/i, "") 
        .trim()
        .toUpperCase();
      const resolvedByAbbr = abbrMap[upperAbbr];
      if (resolvedByAbbr) {
        return { ...slot, courseCode: resolvedByAbbr };
      }
    }
    return slot;
  });
}

export class PdfParserService {
  static async parseTimetable(filePath: string): Promise<ParsedTimetable[]> {
    console.log("Converting PDF pages to images...");
    const allTimetables: ParsedTimetable[] = [];
    let current: ParsedTimetable | null = null;

    const document = await pdf(filePath, { scale: 2 });

    for await (const pageImage of document) {
      const base64 = Buffer.from(pageImage).toString("base64");
      if (base64.length < 5000) continue;

      const result = await extractPageWithGroq(base64, 0);


      const isNewSection =
        result.departmentCode &&
        (!current ||
          result.departmentCode !== current.departmentCode ||
          result.branchName !== current.branchName ||
          result.semester !== current.semester);

      if (isNewSection) {
        if (current) allTimetables.push(TimetableSchema.parse(current));
        current = {
          departmentName: result.departmentName || "",
          departmentCode: result.departmentCode || "",
          branchName: result.branchName || "",
          semester: result.semester || 0,
          sectionName: result.sectionName || "",
          slots: [],
          facultyMap: {},
          courseMetadata: [],
        };
      }

      if (current) {
        if (result.slots) current.slots.push(...result.slots);
        if (result.facultyMap)
          Object.assign(current.facultyMap, result.facultyMap);
        if (result.courseMetadata) {
          const existingCodes = new Set(
            current.courseMetadata.map((c) => c.code),
          );
          for (const cm of result.courseMetadata) {
            if (!existingCodes.has(cm.code)) {
              current.courseMetadata.push(cm);
              existingCodes.add(cm.code);
            }
          }
        }
      }
      await new Promise((res) => setTimeout(res, 600));
    }
    if (current) allTimetables.push(TimetableSchema.parse(current));


    return allTimetables.map((t) => {
      const abbrMap = buildAbbrMap(t.courseMetadata);
      t.slots = resolveCourseCodes(t.slots, abbrMap);
      return t;
    });
  }
}
