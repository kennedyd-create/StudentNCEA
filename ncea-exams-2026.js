/* ============================================================
   NCEA EXAMINATION PERIOD — 2026
   Used by the study timetable to constrain and sanity-check the
   exam dates a student enters.

   PER-SUBJECT DATES
   Level 3 dates below were read off the official NZQA 2026
   Examination Timetable PDF and confirmed by a teacher, because
   the four-column layout (Level 1 / Level 2 / Level 3 /
   Scholarship) cannot be extracted reliably by machine. They are
   PRE-FILLED DEFAULTS, not an authority: students can override
   any of them, and anyone with Special Assessment Conditions or
   a derived grade should confirm against NZQA.

   Levels 1 and 2 are not filled in yet — those subjects will
   simply ask the student for a date until they are added.

   TO UPDATE FOR A NEW YEAR: change the window, the non-session
   days and the year. Nothing else in the app needs touching.
   Source: NZQA 2026 Examination Timetable.
   ============================================================ */
(function () {

window.NCEA_EXAMS = {
  year: 2026,

  // Confirmed by NZQA circulars A2025/16 and A2025/12.
  // Note the start was moved back a week from the originally
  // published 3 November, so older documents will disagree.
  window: { start: '2026-11-10', end: '2026-12-04' },

  // Regional anniversary days with no scheduled sessions.
  noSessionDays: [
    { date: '2026-11-13', reason: 'Canterbury Anniversary Day' },
    { date: '2026-11-30', reason: 'Westland and Chatham Islands Anniversary Days' }
  ],

  // Every exam starts at one of these two times.
  sessions: [
    { id: 'AM', label: 'Morning', start: '09:30' },
    { id: 'PM', label: 'Afternoon', start: '14:00' }
  ],

  // Where students go to find their own dates.
  timetableUrl: 'https://www2.nzqa.govt.nz/ncea/exam-timetable-and-key-assessment-dates/exam-timetable/',
  timetablePdf: 'https://www2.nzqa.govt.nz/assets/NCEA/2026-Exam-Timetable.pdf',

  /* sitting: 'digital', 'paper', or 'performance' — how WAIHEKE students sit
     each exam. Scholarship Drama is assessed by RECORDED PERFORMANCE rather
     than a written paper, so it needs neither typing nor handwriting practice.
     NZQA marks which papers are AVAILABLE digitally, but each school chooses
     per session; WHS enters students digitally wherever it is offered. Two
     entries have no sitting recorded (Level 1 Mathematics and Statistics,
     Scholarship Drama) and simply show nothing rather than a guess. */

  /* ---- Per-subject exam dates, keyed by level then subject name.
     Subject names must match those in the ncea-lN.js data files.
     Session is 'AM' (09:30) or 'PM' (14:00). ---- */
  subjectDates: {
    '3': {
      'Digital Technologies':      { date:'2026-11-10', session:'PM', sitting:'digital' },
      'English':                   { date:'2026-11-11', session:'AM', sitting:'digital' },
      'Physics':                   { date:'2026-11-12', session:'PM', sitting:'paper' },
      'Te Ao Haka':                { date:'2026-11-12', session:'PM', sitting:'digital' },
      'Calculus':                  { date:'2026-11-16', session:'AM', sitting:'paper' },
      'History':                   { date:'2026-11-16', session:'PM', sitting:'digital' },
      'Biology':                   { date:'2026-11-17', session:'PM', sitting:'paper' },
      'Health':                    { date:'2026-11-18', session:'AM', sitting:'digital' },
      'Psychology':                { date:'2026-11-18', session:'PM', sitting:'digital' },
      'Economics':                 { date:'2026-11-18', session:'PM', sitting:'paper' },
      'Drama':                     { date:'2026-11-20', session:'AM', sitting:'paper' },
      'Chemistry':                 { date:'2026-11-20', session:'PM', sitting:'paper' },
      'Statistics':                { date:'2026-11-24', session:'AM', sitting:'paper' },
      'Geography':                 { date:'2026-11-24', session:'PM', sitting:'paper' },
      'Te Reo Māori':              { date:'2026-11-26', session:'AM', sitting:'digital' },
      'Media Studies':             { date:'2026-11-26', session:'PM', sitting:'digital' },
      'Music':                     { date:'2026-11-27', session:'AM', sitting:'paper' },
      'Art History':               { date:'2026-11-27', session:'PM', sitting:'digital' },
      'Classical Studies':         { date:'2026-12-01', session:'AM', sitting:'digital' },
      'Earth & Space Science':     { date:'2026-12-02', session:'PM', sitting:'digital' },
      'Business Studies':          { date:'2026-12-03', session:'PM', sitting:'digital' }
      // Physical Education has no externals, so it never appears here.
      // Te Ao Haka's TAPā assessments were moved into the exam period;
      // this date was confirmed against the published timetable.
    },
    '2': {
      'Geography':                 { date:'2026-11-10', session:'AM', sitting:'paper' },
      'English':                   { date:'2026-11-12', session:'AM', sitting:'digital' },
      'Chemistry':                 { date:'2026-11-16', session:'PM', sitting:'paper' },
      'Te Reo Māori':              { date:'2026-11-16', session:'AM', sitting:'digital' },
      'Art History':               { date:'2026-11-18', session:'AM', sitting:'digital' },
      'Physics':                   { date:'2026-11-18', session:'PM', sitting:'paper' },
      'Mathematics and Statistics':{ date:'2026-11-19', session:'AM', sitting:'paper' },
      'Biology':                   { date:'2026-11-20', session:'AM', sitting:'paper' },
      'Drama':                     { date:'2026-11-20', session:'PM', sitting:'paper' },
      'Business Studies':          { date:'2026-11-23', session:'PM', sitting:'digital' },
      'History':                   { date:'2026-11-24', session:'PM', sitting:'digital' },
      'Classical Studies':         { date:'2026-11-25', session:'PM', sitting:'digital' },
      'Media Studies':             { date:'2026-11-26', session:'AM', sitting:'digital' },
      'Health':                    { date:'2026-11-26', session:'PM', sitting:'digital' },
      'Digital Technologies':      { date:'2026-11-27', session:'PM', sitting:'digital' },
      'Earth & Space Science':     { date:'2026-12-01', session:'AM', sitting:'paper' },
      'Music':                     { date:'2026-12-01', session:'PM', sitting:'paper' }
      // Physical Education and Psychology have no externals at Level 2.
    },
    '1': {
      'Mathematics and Statistics':{ date:'2026-11-10', session:'AM', sitting:'paper' },
      'Physics, Earth and Space Science':{ date:'2026-11-12', session:'PM', sitting:'paper' },
      'Te Reo Māori':              { date:'2026-11-16', session:'PM', sitting:'digital' },
      'English':                   { date:'2026-11-17', session:'AM', sitting:'digital' },
      'Geography':                 { date:'2026-11-17', session:'PM', sitting:'paper' },
      'History':                   { date:'2026-11-18', session:'AM', sitting:'digital' },
      'Chemistry and Biology':     { date:'2026-11-19', session:'PM', sitting:'digital' },
      'Commerce':                  { date:'2026-11-24', session:'AM', sitting:'digital' },
      'Health Studies':            { date:'2026-11-25', session:'AM', sitting:'digital' },
      'Science':                   { date:'2026-11-25', session:'PM', sitting:'digital' },
      'Digital Technologies':      { date:'2026-11-26', session:'AM', sitting:'digital' },
      // No sat examination — these are externally assessed by PORTFOLIO,
      // submitted digitally on a date the school sets. The student enters
      // their own submission date and the plan runs up to it.
      'Drama':             { portfolio:true },
      'Music':             { portfolio:true },
      'Physical Education':{ portfolio:true }
    }
  },

  /* New Zealand Scholarship sits in the same examination period. These are
     held here ready for when Scholarship subjects are added to the tool —
     nothing reads them yet. Scholarship has no credits and no A/M/E bands:
     one three-hour paper per subject, graded Scholarship or Outstanding. */
  scholarshipDates: {
    'Classical Studies': { date:'2026-11-10', session:'AM', sitting:'paper' },
    'Geography':         { date:'2026-11-11', session:'PM', sitting:'paper' },
    'Chemistry':         { date:'2026-11-12', session:'AM', sitting:'paper' },
    'Statistics':        { date:'2026-11-16', session:'PM', sitting:'paper' },
    'Physics':           { date:'2026-11-18', session:'AM', sitting:'paper' },
    'Biology':           { date:'2026-11-19', session:'AM', sitting:'digital' },
    'English':           { date:'2026-11-23', session:'AM', sitting:'digital' },
    'Calculus':          { date:'2026-11-25', session:'AM', sitting:'paper' },
    'Drama':             { date:'2026-11-25', session:'PM', sitting:'performance' },
    'History':           { date:'2026-11-27', session:'PM', sitting:'digital' }
  },

  // 'digital', 'paper', or null where we have not recorded it.
  sittingFor(level, subject){
    const d = this.dateFor(level, subject);
    return (d && d.sitting) ? d.sitting : null;
  },

  // Pre-filled date for a subject, or null if we do not have one.
  // Level 'S' reads the Scholarship table.
  dateFor(level, subject){
    const table = level === 'S' ? this.scholarshipDates : this.subjectDates[level];
    return (table && table[subject]) ? table[subject] : null;
  },

  /* ---- helpers used by the timetable builder ---- */

  /* Dates are parsed in UTC. Parsing 'YYYY-MM-DD' as local time shifts the
     weekday west of the date line — in New Zealand a Saturday read as a
     Friday, so weekend entries were being accepted. */
  parse(s){ const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); },

  // Exams run Monday to Friday only, and not on anniversary days.
  isExamDay(iso){
    if (!iso) return false;
    const d = this.parse(iso);
    if (isNaN(d)) return false;
    if (iso < this.window.start || iso > this.window.end) return false;
    const day = d.getUTCDay();
    if (day === 0 || day === 6) return false;
    return !this.noSessionDays.some(n => n.date === iso);
  },

  // Returns null if the date is fine, otherwise a plain-English problem.
  checkDate(iso){
    if (!iso) return 'No date entered.';
    const d = this.parse(iso);
    if (isNaN(d)) return 'That is not a valid date.';
    if (iso < this.window.start)
      return `Exams do not start until ${this.pretty(this.window.start)}.`;
    if (iso > this.window.end)
      return `Exams finish on ${this.pretty(this.window.end)}.`;
    const day = d.getUTCDay();
    if (day === 0 || day === 6) return 'That is a weekend — no exams are scheduled.';
    const off = this.noSessionDays.find(n => n.date === iso);
    if (off) return `No sessions that day — ${off.reason}.`;
    return null;
  },

  pretty(iso){
    return this.parse(iso).toLocaleDateString('en-NZ',
      { timeZone:'UTC', weekday:'short', day:'numeric', month:'short' });
  }
};

})();
