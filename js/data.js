/* AFO Grade Reporting — demo data.
   EVERY student, staff member and email address here is fictional.
   Emails use the reserved .example domain so nothing can reach a real person. */

const TODAY = '2026-11-10';
const SCHOOL_YEAR = '2026/2027';
const OVERDUE_DAYS = 10;           // not on transcript after this many days = overdue
const LAST_SCAN = '11/10/2026 5:00 AM';

/* AFO enters for students from every campus; reports route to the home-campus registrar. */
const CAMPUSES = {
  AFO:  { name: 'Agua Fria Online', mascot: null, primary: '#C7314C', banner: 'afo.png', home: false },
  AFHS: { name: 'Agua Fria High School', mascot: 'Owls', primary: '#BF0E1E', banner: 'afhs.png', home: true },
  CVHS: { name: 'Canyon View High School', mascot: 'Jaguars', primary: '#1D5FD8', banner: 'cvhs.png', home: true },
  DEHS: { name: 'Desert Edge High School', mascot: 'Scorpions', primary: '#D1571F', banner: 'dehs.png', home: true },
  GHS:  { name: 'Goodyear High School', mascot: 'Mustangs', primary: '#158036', banner: 'ghs.png', home: true },
  HSA:  { name: 'Hilltop', mascot: 'Peacocks', primary: '#7A1E46', banner: 'hsa.png', home: true },
  MHS:  { name: 'Millennium High School', mascot: 'Tigers', primary: '#5B1980', banner: 'mhs.png', home: true },
  VHS:  { name: 'Verrado High School', mascot: 'Vipers', primary: '#A8841F', banner: 'vhs.png', home: true },
};
const HOME_CAMPUSES = Object.keys(CAMPUSES).filter(k => CAMPUSES[k].home);

const ROLES = {
  owner:     { label: 'Owner',     desc: 'Everything, including managing admins' },
  admin:     { label: 'Admin',     desc: 'Enter grades, all reports, admin page' },
  registrar: { label: 'Registrar', desc: 'Sees reports and transcript status for their campus' },
};

let USERS = [
  { id: 'u1',  name: 'Morgan Ellis',    email: 'mellis@district.example',     role: 'owner',     campus: 'AFO' },
  { id: 'u2',  name: 'Dana Whitfield',  email: 'dwhitfield@district.example', role: 'admin',     campus: 'AFO' },
  { id: 'u3',  name: 'Priya Natarajan', email: 'pnatarajan@district.example', role: 'admin',     campus: 'AFO' },
  { id: 'u4',  name: 'Jordan Tate',     email: 'jtate@district.example',      role: 'admin',     campus: 'AFO' },
  { id: 'u7',  name: 'Lena Brooks',     email: 'lbrooks@district.example',    role: 'registrar', campus: 'CVHS' },
  { id: 'u8',  name: 'Tom Albright',    email: 'talbright@district.example',  role: 'registrar', campus: 'AFHS' },
  { id: 'u9',  name: 'Sofia Mendez',    email: 'smendez@district.example',    role: 'registrar', campus: 'DEHS' },
  { id: 'u10', name: 'Grace Kim',       email: 'gkim@district.example',       role: 'registrar', campus: 'MHS' },
  { id: 'u11', name: 'Owen Fitch',      email: 'ofitch@district.example',     role: 'registrar', campus: 'VHS' },
  { id: 'u12', name: 'Aisha Grant',     email: 'agrant@district.example',     role: 'registrar', campus: 'GHS' },
  { id: 'u13', name: 'Marco Bell',      email: 'mbell@district.example',      role: 'registrar', campus: 'HSA' },
];

const ROUTING = {
  AFHS: { cc: ['counseling-afhs@district.example'] },
  CVHS: { cc: [] },
  DEHS: { cc: ['dehs-admin@district.example'] },
  GHS:  { cc: [] },
  HSA:  { cc: ['hsa-counselor@district.example'] },
  MHS:  { cc: [] },
  VHS:  { cc: ['vhs-records@district.example'] },
};

/* Course catalog. "synergy" is the code the transcript check matches on. */
const COURSES = [
  ['CREN60A','English I A-CR'],['CREN60B','English I B-CR'],['CREN62A','English II A-CR'],['CREN62B','English II B-CR'],
  ['CREN64A','English III A-CR'],['CREN64B','English III B-CR'],['CREN66A','English IV A-CR'],['CREN66B','English IV B-CR'],
  ['CRMA41A','Algebra I A-CR'],['CRMA41B','Algebra I B-CR'],['CRMA43A','Geometry A-CR'],['CRMA43B','Geometry B-CR'],
  ['CRMA45A','Algebra II A-CR'],['CRMA45B','Algebra II B-CR'],['CRSC70A','Environmental Science A-CR'],['CRSC70B','Environmental Science B-CR'],
  ['CRSC73A','Biology A-CR'],['CRSC73B','Biology B-CR'],['CRSC78A','Chemistry A-CR'],['CRSC78B','Chemistry B-CR'],
  ['CRSO81A','World History A-CR'],['CRSO81B','World History B-CR'],['CRSO83A','American/Arizona History A-CR'],['CRSO83B','American/Arizona History B-CR'],
  ['OLMA41A','Algebra I A'],['OLMA45B','Algebra II B'],['OLSC70A','Environmental Science A'],['OLSC73A','Biology A'],
  ['OLSO83A','American/Arizona History A'],['OLSO83B','American/Arizona History B'],['OLCT90A','Career Planning and Development A'],['OLFI54A','Personal Finance A'],
].map(([code, title]) => ({ code, title, synergy: code, credits: 0.5, active: true }));

const TEACHERS = ['Avery Holt','Bianca Reyes','Carter Lowe','Delia Moss','Ethan Price','Fiona Shaw','Gabe Navarro','Hollis Reed','Iris Coleman','Jonah Pike']
  .map((n, i) => ({ id: 't' + i, name: n, active: true }));

/* ---------- fictional students (seeded, so the demo is the same every load) ---------- */
let seed = 20261110;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
const FIRST = ['Ava','Mason','Lucia','Elijah','Nora','Mateo','Zoe','Kai','Isla','Diego','Maya','Rowan','Leah','Jasper','Camila','Theo','Ruby','Nico','Elena','Owen','Aria','Silas','Jade','Luca','Paige','Felix','Iris','Andre','Tessa','Gavin'];
const LAST = ['Alder','Brightwater','Calloway','Dunmore','Estrada','Fairbanks','Galloway','Hartwell','Ibarra','Juniper','Kessler','Lindqvist','Montoya','Northcutt','Okafor','Pemberton','Quill','Rosales','Stratton','Thornbury','Underhill','Vance','Whitlock','Yarrow','Zamora'];

const STUDENTS = [];
for (let i = 0; i < 70; i++) {
  STUDENTS.push({ id: String(90100 + i * 7 + Math.floor(rnd() * 6)), name: `${pick(FIRST)} ${pick(LAST)}`, grade: pick([9, 10, 11, 11, 12, 12, 12]), home: pick(HOME_CAMPUSES) });
}

function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

/* ---------- reports: one per student per day, all entered through AFO ---------- */
const ENTERERS = ['Morgan Ellis', 'Dana Whitfield', 'Priya Natarajan', 'Jordan Tate'];
let REPORTS = [];
let nextId = 1041;

function makeReport(student, day, status, nCourses) {
  const courses = [], used = new Set();
  for (let c = 0; c < nCourses; c++) {
    let course; do { course = pick(COURSES); } while (used.has(course.code)); used.add(course.code);
    courses.push({
      code: course.code, title: course.title,
      weighted: rnd() < 0.4 ? 'Weighted' : 'Not Weighted',
      grade: pick(['A', 'A', 'B', 'B', 'B', 'C', 'C', 'D']),
      credits: course.credits, teacher: pick(TEACHERS).name,
      completed: addDays(day, -Math.floor(rnd() * 2) - 1),
      transcript: null, // filled by the transcript check: { found, on, grade, credits }
    });
  }
  const by = pick(ENTERERS);
  return {
    id: 'GR-' + (nextId++), program: 'AFO', home: student.home, studentId: student.id, studentName: student.name,
    grade: student.grade, schoolYear: SCHOOL_YEAR, sendDate: day, submittedBy: by, comments: '',
    courses, status, version: 1,
    history: [{ at: fmt0(day) + (status === 'queued' ? ' (today)' : ' 6:00 AM'), by: status === 'queued' ? by : 'System', action: status === 'queued' ? 'Saved to today’s queue' : 'Emailed to registrar' }],
  };
}
function fmt0(iso) { const [y, m, d] = iso.split('-'); return `${+m}/${+d}/${y}`; }

/* simulate what the daily transcript check has found so far */
function simulateTranscript(r) {
  const age = daysBetween(r.sendDate, TODAY);
  // some registrars are slower than others
  const slow = { GHS: 0.35, HSA: 0.2 }[r.home] || 0;
  r.courses.forEach(c => {
    const p = age >= 6 ? 0.92 - slow : age >= 3 ? 0.7 - slow : age >= 1 ? 0.3 : 0;
    if (rnd() < p) {
      const lag = Math.min(age, 1 + Math.floor(rnd() * Math.min(age, 6)));
      c.transcript = { found: true, on: addDays(r.sendDate, lag), grade: c.grade, credits: c.credits };
    }
  });
  const found = r.courses.filter(c => c.transcript);
  if (found.length) {
    const last = found.map(c => c.transcript.on).sort().pop();
    r.history.push({ at: fmt0(last) + ' 5:00 AM', by: 'Transcript check', action: `${found.length} of ${r.courses.length} course${r.courses.length > 1 ? 's' : ''} found on transcript` });
  }
}

(function build() {
  for (let d = 24; d >= 1; d--) {
    const day = addDays(TODAY, -d);
    const dow = new Date(day + 'T12:00:00').getDay();
    if (dow === 0 || dow === 6) continue;
    const n = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const r = makeReport(pick(STUDENTS), day, 'sent', pick([1, 1, 1, 2, 2, 3]));
      simulateTranscript(r);
      REPORTS.push(r);
    }
  }
  for (let k = 0; k < 5; k++) REPORTS.push(makeReport(pick(STUDENTS), TODAY, 'queued', pick([1, 2, 3])));

  // two mismatches: transcript shows a different grade / credits than the report
  const found = REPORTS.filter(r => r.status === 'sent' && r.courses.every(c => c.transcript));
  if (found[3]) { const c = found[3].courses[0]; c.transcript.grade = c.grade === 'C' ? 'D' : 'C'; }
  if (found[9]) { const c = found[9].courses[0]; c.transcript.credits = 0.25; }

  // one report flagged back by the registrar
  const flag = REPORTS.find(r => r.status === 'sent' && r.courses.every(c => !c.transcript) && daysBetween(r.sendDate, TODAY) <= 4);
  if (flag) {
    flag.status = 'flagged';
    flag.flagNote = 'Course says Geometry B but the student’s schedule shows Geometry A — please check.';
    const reg = USERS.find(u => u.role === 'registrar' && u.campus === flag.home);
    flag.history.push({ at: fmt0(addDays(flag.sendDate, 1)) + ' 10:02 AM', by: reg ? reg.name : 'Registrar', action: 'Flagged: ' + flag.flagNote });
  }
})();

/* daily scan log, rebuilt from the simulated results */
const SCANS = [];
for (let d = 0; d <= 13; d++) {
  const day = addDays(TODAY, -d);
  const dow = new Date(day + 'T12:00:00').getDay();
  if (dow === 0 || dow === 6) continue;
  const newly = REPORTS.flatMap(r => r.courses).filter(c => c.transcript && c.transcript.on === day).length;
  const checked = REPORTS.filter(r => r.status !== 'queued' && r.sendDate < day).flatMap(r => r.courses).filter(c => !c.transcript || c.transcript.on >= day).length;
  SCANS.push({ at: fmt0(day) + ' 5:00 AM', checked, found: newly, mismatches: d === 0 ? 2 : 0, ok: true });
}

let ACTIVITY = [
  { at: '11/10/2026 8:42 AM', who: 'Dana Whitfield', what: 'Added 3 courses for 2 students' },
  { at: '11/10/2026 6:00 AM', who: 'System', what: 'Morning send: 6 reports emailed to 4 registrars' },
  { at: '11/10/2026 5:00 AM', who: 'Transcript check', what: `Checked Synergy credit history: ${SCANS[0].found} courses newly found on transcripts` },
  { at: '11/9/2026 3:51 PM', who: 'Morgan Ellis', what: 'Added registrar Marco Bell for HSA' },
  { at: '11/9/2026 1:30 PM', who: 'Priya Natarajan', what: 'Sent a correction for a VHS report' },
  { at: '11/6/2026 11:05 AM', who: 'Morgan Ellis', what: 'Changed DEHS CC list' },
];
