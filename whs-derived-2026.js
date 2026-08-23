/* ============================================================
   WAIHEKE HIGH SCHOOL — DERIVED GRADE EXAMINATIONS 2026
   Monday 7 to Friday 11 September.

   These are the school's own mock examinations, sat under exam
   conditions, and used as evidence for a derived grade if
   something goes wrong in November. They are NOT NZQA exams:
   the dates come from the school, not from the national
   timetable, so nothing here is checked against NZQA.

   Students are off timetable for the whole of that week, which
   the study planner treats as a short block of study leave.

   Sessions differ from NZQA's:
     AM  08:45 – 11:45
     PM  12:20 – 15:20

   NOT EVERY SESSION IS A WRITTEN EXAM. Some subjects are
   assessed in a practical workshop instead, and there is
   nothing to revise for in the usual sense — Level 2 Physical
   Education, Level 2 Psychology and Level 3 Physical Education
   all sit a workshop rather than a paper, so they are left out
   deliberately rather than by oversight.

   Subjects the tool does not carry (Building and Construction,
   Product Design, Spatial Design, Food Technology, Outdoor
   Education, Sea Sports, and the practical art subjects) are
   listed in the comments below but not offered, because there
   are no standards behind them to revise from.

   TO UPDATE NEXT YEAR: change the week, the sessions if they
   move, and the entries. Nothing else needs touching.
   ============================================================ */
(function () {

window.WHS_DERIVED = {
  year: 2026,
  label: 'WHS Derived Grade Exams',
  short: 'Derived grade',

  // The examination week. Students are off normal timetable throughout.
  window: { start: '2026-09-07', end: '2026-09-11' },

  sessions: [
    { id: 'AM', label: 'Morning',   start: '08:45', end: '11:45' },
    { id: 'PM', label: 'Afternoon', start: '12:20', end: '15:20' }
  ],

  /* Subject names here MUST match those in the ncea-lN.js data files,
     otherwise the planner cannot find the standards to revise. Where the
     school's name differs, the tool's name is used and the school's is
     noted alongside. */
  subjectDates: {

    '1': {
      'Science':                    { date:'2026-09-07', session:'PM' },
      'Digital Technologies':       { date:'2026-09-08', session:'AM' },
      'Mathematics and Statistics': { date:'2026-09-08', session:'PM' },
      'English':                    { date:'2026-09-09', session:'PM' },
      'History':                    { date:'2026-09-10', session:'AM' },
      'Music':                      { date:'2026-09-10', session:'PM' },
      'Commerce':                   { date:'2026-09-11', session:'AM' },
      // Level 1 PE is unlike Levels 2 and 3: it HAS written externals
      // (AS92018 and AS92019), so its session is a real paper.
      'Physical Education':         { date:'2026-09-11', session:'PM' },
      'Te Reo Māori':               { date:'2026-09-11', session:'PM' }
      // Also sat, but not carried by this tool: Building Construction and
      // Allied Trades Skills, Product Design, Food Technology, Art,
      // Spatial Design, Outdoor Education.
    },

    '2': {
      'Business Studies':           { date:'2026-09-07', session:'AM' },
      'Physics':                    { date:'2026-09-07', session:'PM' },
      'Te Reo Māori':               { date:'2026-09-07', session:'PM' },
      'Health':                     { date:'2026-09-08', session:'AM' },
      'Classical Studies':          { date:'2026-09-08', session:'PM' },
      'Mathematics and Statistics': { date:'2026-09-09', session:'AM' },
      'English':                    { date:'2026-09-09', session:'PM' },
      'Chemistry':                  { date:'2026-09-10', session:'AM' },
      'Geography':                  { date:'2026-09-10', session:'AM' },
      'History':                    { date:'2026-09-10', session:'PM' },
      'Digital Technologies':       { date:'2026-09-11', session:'AM' },
      'Music':                      { date:'2026-09-11', session:'AM' },
      'Biology':                    { date:'2026-09-11', session:'PM' },
      'Drama':                      { date:'2026-09-11', session:'PM' }
      // Physical Education and Psychology sit a WORKSHOP at Level 2, not a
      // written exam, so they are not scheduled here.
      // The school also runs Mathematics Calculus at Level 2, which the tool
      // holds inside Mathematics and Statistics, plus Product Design, Digital
      // Art, Food Technology, Paint Print and Textile Art, Spatial Design,
      // Sea Sports, Te Ao Haka and Building Construction.
    },

    '3': {
      'Business Studies':           { date:'2026-09-07', session:'AM' },
      'Health':                     { date:'2026-09-07', session:'PM' },
      'Physics':                    { date:'2026-09-07', session:'PM' },
      'Biology':                    { date:'2026-09-08', session:'AM' },
      'Te Ao Haka':                 { date:'2026-09-08', session:'AM' },
      'Classical Studies':          { date:'2026-09-08', session:'PM' },
      'Calculus':                   { date:'2026-09-08', session:'PM' },   // school: Mathematics Calculus
      'History':                    { date:'2026-09-09', session:'AM' },
      'Chemistry':                  { date:'2026-09-10', session:'AM' },
      'Music':                      { date:'2026-09-10', session:'AM' },
      'English':                    { date:'2026-09-10', session:'PM' },
      'Geography':                  { date:'2026-09-11', session:'AM' },
      'Drama':                      { date:'2026-09-11', session:'PM' },
      'Statistics':                 { date:'2026-09-11', session:'PM' }    // school: Mathematics and Statistics
      // Physical Education sits a WORKSHOP at Level 3, not a written exam.
      // Also sat: Building Construction, Paint Print and Textile Art,
      // Digital Art, Sea Sports, Spatial Design.
    }
  },


  /* ---- WORKSHOP SESSIONS ----
     Practical assessments sat during the same week. They occupy a half-day —
     so nothing can be scheduled against them — but there is no written paper
     to revise for, so they never appear in the study blocks leading up.

     These subjects are mostly not carried in the NCEA data files at all,
     which is fine: a name, a day and a session is everything needed. ---- */
  workshops: {
    '1': {
      'Building, Construction and Allied Trades Skills': { date:'2026-09-07', session:'AM' },
      'Product Design':                                  { date:'2026-09-07', session:'AM' },
      'Food Technology':                                 { date:'2026-09-08', session:'AM' },
      'Art':                                             { date:'2026-09-09', session:'AM' },
      'Spatial Design':                                  { date:'2026-09-10', session:'AM' },
      'Outdoor Education':                               { date:'2026-09-11', session:'AM' }
    },
    '2': {
      'Building, Construction and Allied Trades Skills': { date:'2026-09-07', session:'AM' },
      'Psychology':                                      { date:'2026-09-07', session:'PM' },
      'Product Design':                                  { date:'2026-09-08', session:'AM' },
      'Digital Art':                                     { date:'2026-09-08', session:'PM' },
      'Physical Education':                              { date:'2026-09-08', session:'PM' },
      'Food Technology':                                 { date:'2026-09-10', session:'AM' },
      'Paint, Print and Textile Art':                    { date:'2026-09-10', session:'AM' },
      'Spatial Design':                                  { date:'2026-09-10', session:'PM' },
      'Sea Sports':                                      { date:'2026-09-11', session:'PM' }
    },
    '3': {
      'Building, Construction and Allied Trades Skills': { date:'2026-09-07', session:'AM' },
      'Paint, Print and Textile Art':                    { date:'2026-09-07', session:'AM' },
      'Digital Art':                                     { date:'2026-09-08', session:'PM' },
      'Physical Education':                              { date:'2026-09-09', session:'AM' },
      'Sea Sports':                                      { date:'2026-09-09', session:'PM' },
      'Spatial Design':                                  { date:'2026-09-11', session:'AM' }
    }
  },

  // Every subject sat that week, exam or workshop, for the picker.
  allSubjects(level){
    const a = Object.keys(this.subjectDates[level] || {});
    const b = Object.keys(this.workshops[level] || {});
    return [...new Set([...a, ...b])].sort();
  },
  isWorkshop(level, subject){
    return !!(this.workshops[level] && this.workshops[level][subject]);
  },
  workshopFor(level, subject){
    const t = this.workshops[level];
    return (t && t[subject]) ? t[subject] : null;
  },

  /* ---- helpers, mirroring NCEA_EXAMS so the planner can use either ---- */

  parse(s){ const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); },

  dateFor(level, subject){
    const t = this.subjectDates[level];
    return (t && t[subject]) ? t[subject] : null;
  },

  // Derived grades cover internals too, so any subject in the list qualifies.
  has(level, subject){ return !!this.dateFor(level, subject); },

  checkDate(iso){
    if(!iso) return 'No date entered.';
    const d = this.parse(iso);
    if(isNaN(d)) return 'That is not a valid date.';
    if(iso < this.window.start || iso > this.window.end)
      return `Derived grade exams run ${this.pretty(this.window.start)} to ${this.pretty(this.window.end)}.`;
    const day = d.getUTCDay();
    if(day === 0 || day === 6) return 'That is a weekend.';
    return null;
  },

  pretty(iso){
    return this.parse(iso).toLocaleDateString('en-NZ',
      { timeZone:'UTC', weekday:'short', day:'numeric', month:'short' });
  }
};

})();
