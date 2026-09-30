import type { AttendanceMark, AttendanceStatus } from './types'

export const DEMO_SCHOOL = 'Greenfield Academy'
export const DEMO_TERM = 'First Term 2025/2026'
export const DEMO_CLASS = 'JSS 1A'
export const DEMO_CLAIM = 'ADAEZE01'

export type DemoRole = 'parent' | 'teacher' | 'admin'

export type DemoStudent = {
  id: string
  first_name: string
  last_name: string
  admission: string
  status: AttendanceStatus | null
}

export type DemoLesson = {
  id: string
  subject: string
  topic: string
  summary: string
  homework?: string
  homework_due_date?: string
  date: string
}

export type DemoNotice = {
  id: string
  title: string
  body: string
  date: string
}

function seededTerm(seed: number, days = 48): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    const status: AttendanceStatus | null =
      i > days - 2 ? 'present' : r > 94 ? 'absent' : r > 88 ? 'late' : r > 85 ? 'excused' : 'present'
    const d = new Date(2026, 0, 12 + Math.floor(i / 5) * 7 + (i % 5))
    out.push({ date: d.toISOString().slice(0, 10), status })
  }
  return out
}

export const demoMarks = seededTerm(19)
export const demoFlaggedMarks = seededTerm(41)

export function attendancePct(marks: AttendanceMark[]) {
  const taken = marks.filter((m) => m.status)
  if (!taken.length) return null
  const ok = taken.filter((m) => m.status === 'present' || m.status === 'late').length
  return Math.round((ok / taken.length) * 100)
}

export const demoStudents: DemoStudent[] = [
  { id: 's1', first_name: 'Adaeze', last_name: 'Okonkwo', admission: 'GFA-2401', status: 'present' },
  { id: 's2', first_name: 'Chinedu', last_name: 'Eze', admission: 'GFA-2402', status: 'present' },
  { id: 's3', first_name: 'Bola', last_name: 'Adeyemi', admission: 'GFA-2403', status: 'late' },
  { id: 's4', first_name: 'Fatima', last_name: 'Bello', admission: 'GFA-2404', status: 'present' },
  { id: 's5', first_name: 'Ibrahim', last_name: 'Sule', admission: 'GFA-2405', status: null },
  { id: 's6', first_name: 'Amaka', last_name: 'Nwosu', admission: 'GFA-2406', status: 'present' },
  { id: 's7', first_name: 'Tunde', last_name: 'Balogun', admission: 'GFA-2407', status: 'absent' },
  { id: 's8', first_name: 'Zainab', last_name: 'Yusuf', admission: 'GFA-2408', status: 'present' },
]

export function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const demoLessonsToday: DemoLesson[] = [
  {
    id: 'l1',
    subject: 'Mathematics',
    topic: 'Linear equations in one variable',
    summary:
      'Solved for x using inverse operations. Worked three word problems from the NERDC scheme.',
    homework: 'Exercise 4.2, questions 1 to 8. Show working.',
    homework_due_date: 'Tomorrow',
    date: todayISO(),
  },
  {
    id: 'l2',
    subject: 'English Language',
    topic: 'Comprehension: The market at dawn',
    summary: 'Read the passage aloud in groups. Identified main idea and three supporting details.',
    homework: 'Write a 120-word recount of a market you know.',
    homework_due_date: 'Friday',
    date: todayISO(),
  },
  {
    id: 'l3',
    subject: 'Basic Science',
    topic: 'Photosynthesis',
    summary: 'Named the raw materials and products. Drew the leaf cross-section from the board.',
    date: todayISO(),
  },
]

export const demoEarlier: DemoLesson[] = [
  {
    id: 'l4',
    subject: 'Social Studies',
    topic: 'Leadership in the community',
    summary: 'Discussed roles of the family, school and local government.',
    date: '2026-03-24',
  },
  {
    id: 'l5',
    subject: 'Yoruba',
    topic: 'Orin ibile',
    summary: 'Learned two folk songs and the meaning of the chorus.',
    homework: 'Practice the chorus at home.',
    homework_due_date: 'Monday',
    date: '2026-03-24',
  },
]

export const demoNotices: DemoNotice[] = [
  {
    id: 'n1',
    title: 'PTA meeting — Friday 2pm',
    body: 'Hall. First Term reports will be discussed. One guardian per family.',
    date: 'Today',
  },
  {
    id: 'n2',
    title: 'Resumption after mid-term',
    body: 'School resumes Monday 13 April. Uniform inspection at the gate.',
    date: 'Yesterday',
  },
]

export const demoTimetable = [
  { time: '08:00', subject: 'Assembly' },
  { time: '08:30', subject: 'Mathematics' },
  { time: '09:20', subject: 'English Language' },
  { time: '10:10', subject: 'Break' },
  { time: '10:30', subject: 'Basic Science' },
  { time: '11:20', subject: 'Social Studies' },
  { time: '12:10', subject: 'Yoruba' },
  { time: '13:00', subject: 'Closing' },
]

export const demoFees = {
  term: DEMO_TERM,
  billed: 120000,
  paid: 85000,
  due: 35000,
  dueDate: '18 April 2026',
  history: [
    { date: '12 Jan 2026', amount: 50000, note: 'First instalment' },
    { date: '20 Feb 2026', amount: 35000, note: 'Second instalment' },
  ],
}

export const demoBehaviour = [
  { id: 'b1', points: 2, note: 'Helped a classmate with the maths exercise', date: 'Today' },
  { id: 'b2', points: 1, note: 'On time for assembly all week', date: 'Yesterday' },
  { id: 'b3', points: -1, note: 'Talking during silent reading', date: 'Mon' },
]

export const demoAdmin = {
  students: 248,
  classes: 12,
  markedToday: 241,
  lessonsToday: 11,
  unlinkedParents: 18,
  attendancePct: 96,
  missing: ['JSS 2B', 'Primary 4A'],
  flagged: [
    { name: 'Bola Adeyemi', klass: 'JSS 1A', pct: 68, reason: 'Attendance falling' },
    { name: 'Tunde Balogun', klass: 'JSS 1A', pct: 71, reason: 'Three absences this fortnight' },
  ],
}
