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

  /* ---- Per-subject exam dates, keyed by level then subject name.
     Subject names must match those in the ncea-lN.js data files.
     Session is 'AM' (09:30) or 'PM' (14:00). ---- */
  subjectDates: {
    '3': {
      'Digital Technologies':      { date:'2026-11-10', session:'PM' },
      'English':                   { date:'2026-11-11', session:'AM' },
      'Physics':                   { date:'2026-11-12', session:'PM' },
      'Te Ao Haka':                { date:'2026-11-12', session:'PM' },
      'Calculus':                  { date:'2026-11-16', session:'AM' },
      'History':                   { date:'2026-11-16', session:'PM' },
      'Biology':                   { date:'2026-11-17', session:'PM' },
      'Health':                    { date:'2026-11-18', session:'AM' },
      'Psychology':                { date:'2026-11-18', session:'PM' },
      'Drama':                     { date:'2026-11-20', session:'AM' },
      'Chemistry':                 { date:'2026-11-20', session:'PM' },
      'Statistics':                { date:'2026-11-24', session:'AM' },
      'Geography':                 { date:'2026-11-24', session:'PM' },
      'Te Reo Māori':              { date:'2026-11-26', session:'AM' },
      'Media Studies':             { date:'2026-11-26', session:'PM' },
      'Music':                     { date:'2026-11-27', session:'AM' },
      'Art History':               { date:'2026-11-27', session:'PM' },
      'Classical Studies':         { date:'2026-12-01', session:'AM' },
      'Earth & Space Science':     { date:'2026-12-02', session:'PM' },
      'Business Studies':          { date:'2026-12-03', session:'PM' }
      // Physical Education has no externals, so it never appears here.
      // Te Ao Haka's TAPā assessments were moved into the exam period;
      // this date was confirmed against the published timetable.
    },
    '2': {},
    '1': {}
  },

  // Pre-filled date for a subject, or null if we do not have one.
  dateFor(level, subject){
    const lvl = this.subjectDates[level];
    return (lvl && lvl[subject]) ? lvl[subject] : null;
  },

  /* ---- helpers used by the timetable builder ---- */

  // Exams run Monday to Friday only, and not on anniversary days.
  isExamDay(iso){
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return false;
    if (iso < this.window.start || iso > this.window.end) return false;
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    return !this.noSessionDays.some(n => n.date === iso);
  },

  // Returns null if the date is fine, otherwise a plain-English problem.
  checkDate(iso){
    if (!iso) return 'No date entered.';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return 'That is not a valid date.';
    if (iso < this.window.start)
      return `Exams do not start until ${this.pretty(this.window.start)}.`;
    if (iso > this.window.end)
      return `Exams finish on ${this.pretty(this.window.end)}.`;
    const day = d.getDay();
    if (day === 0 || day === 6) return 'That is a weekend — no exams are scheduled.';
    const off = this.noSessionDays.find(n => n.date === iso);
    if (off) return `No sessions that day — ${off.reason}.`;
    return null;
  },

  pretty(iso){
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-NZ',
      { weekday:'short', day:'numeric', month:'short' });
  }
};

})();
