import type { AttendanceMark, AttendanceStatus } from './types'

export const DEMO_SCHOOL = 'Greenfield Academy'
export const DEMO_TERM = 'First Term 2025/2026'
export const DEMO_CLASS = 'JSS 1A'
export const DEMO_CLAIM = 'ADAEZE01'

export const PLAN = {
  name: 'School',
  trialDays: 30,
  price: 200000,
  per: 'year',
  students: 'Unlimited students',
}

export type DemoRole = 'proprietor' | 'admin' | 'teacher' | 'parent' | 'student'

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

/* ---------------------------------------------------------------------------
   Student surface
--------------------------------------------------------------------------- */

export const studentAssignments = [
  {
    id: 'a1',
    subject: 'Mathematics',
    title: 'Exercise 4.2 — Linear equations',
    due: 'Tomorrow',
    status: 'open' as const,
  },
  {
    id: 'a2',
    subject: 'English Language',
    title: 'Write a 120-word recount',
    due: 'Friday',
    status: 'submitted' as const,
  },
  {
    id: 'a3',
    subject: 'Basic Science',
    title: 'Label the leaf cross-section',
    due: 'Monday',
    status: 'open' as const,
  },
]

export const studentResults = [
  { subject: 'Mathematics', ca: 28, exam: 61, total: 89, grade: 'A' },
  { subject: 'English Language', ca: 25, exam: 54, total: 79, grade: 'B' },
  { subject: 'Basic Science', ca: 27, exam: 58, total: 85, grade: 'A' },
  { subject: 'Social Studies', ca: 22, exam: 49, total: 71, grade: 'B' },
  { subject: 'Yoruba', ca: 29, exam: 63, total: 92, grade: 'A' },
]

/* ---------------------------------------------------------------------------
   Admin surface
--------------------------------------------------------------------------- */

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

export const adminClasses = [
  { name: 'JSS 1A', n: 32, teacher: 'Mr. Okafor', posted: true, pct: 96 },
  { name: 'JSS 1B', n: 30, teacher: 'Mrs. Bello', posted: true, pct: 94 },
  { name: 'JSS 2A', n: 31, teacher: 'Mr. Adewale', posted: true, pct: 92 },
  { name: 'JSS 2B', n: 28, teacher: 'Ms. Nnaji', posted: false, pct: 88 },
  { name: 'Primary 4A', n: 36, teacher: 'Mrs. Eze', posted: false, pct: 90 },
  { name: 'Primary 4B', n: 34, teacher: 'Mr. Danjuma', posted: true, pct: 95 },
]

export const demoTasks = [
  { id: 't1', title: 'Enter WAEC mock scores for SS3', who: 'Exams officer', due: 'Fri', done: false },
  { id: 't2', title: 'Send term fee reminders', who: 'Bursar', due: 'Today', done: false },
  { id: 't3', title: 'Approve JSS 2B lesson plan', who: 'Head teacher', due: 'Wed', done: true },
  { id: 't4', title: 'Order next term textbooks', who: 'Admin', due: 'Next week', done: false },
]

/* ---------------------------------------------------------------------------
   Proprietor surface
--------------------------------------------------------------------------- */

export const demoSchool = {
  enrolment: 248,
  staff: 34,
  campuses: 1,
  term: DEMO_TERM,
  attendancePct: 94,
  collected: 18600000,
  outstanding: 3400000,
  billed: 22000000,
  expense: 9400000,
  enrolmentTrend: [
    { label: '2022', value: 180 },
    { label: '2023', value: 205 },
    { label: '2024', value: 224 },
    { label: '2025', value: 248 },
  ],
  classPerformance: [
    { name: 'JSS 1', pct: 91 },
    { name: 'JSS 2', pct: 87 },
    { name: 'JSS 3', pct: 84 },
    { name: 'SS 1', pct: 82 },
    { name: 'SS 2', pct: 80 },
    { name: 'SS 3', pct: 78 },
  ],
  feeByClass: [
    { name: 'JSS 1A', collected: 96 },
    { name: 'JSS 2A', collected: 88 },
    { name: 'SS 2', collected: 74 },
    { name: 'SS 3', collected: 61 },
  ],
  staffOnLeave: 2,
  staffPending: 3,
}

export const demoSchoolNotices = [
  { id: 'p1', title: 'First Term results published', audience: 'All families', date: 'Today', read: 82 },
  { id: 'p2', title: 'Staff development day', audience: 'Teachers', date: 'Mon', read: 100 },
  { id: 'p3', title: 'Fee reminder — 3rd instalment', audience: 'Debtors', date: 'Yesterday', read: 64 },
]

/* ---------------------------------------------------------------------------
   Subscription / billing surface
--------------------------------------------------------------------------- */

export const demoSubscription = {
  plan: PLAN.name,
  status: 'trial' as 'trial' | 'active' | 'lapsed',
  startedOn: '1 September 2026',
  trialEnds: '1 October 2026',
  daysLeft: 12,
  price: PLAN.price,
  billedTo: 'Greenfield Academy',
  method: null as string | null,
  invoices: [
    { id: 'INV-0001', date: '1 Sep 2026', amount: 0, status: 'Trial' },
  ],
}
