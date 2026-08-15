/* ============================================================
   STUDY TIMETABLE
   Builds a real revision schedule, not a prompt asking for one.

   Borrowed from the WHS Year Planner: a flat slot array with a
   BLOCKED sentinel, so the allocator physically cannot schedule
   into an unavailable day. Deliberately inverted where revision
   differs from unit planning — allocation is automatic rather
   than manual, interleaved rather than contiguous, and anchored
   backwards from fixed exam dates.
   ============================================================ */
(function () {

const TT_BUILD = 'build 25 — briefing shows exam mode';

const R = () => document.getElementById('tt-root');
const E = () => window.NCEA_EXAMS;
const D = () => window.NCEA_DATA[S.level];
/* A chosen subject is stored as "level::Subject", so a student can mix
   Level 3 standards and a Scholarship subject in the same timetable. */
const key   = (lvl, name) => lvl + '::' + name;
const kLvl  = k => k.split('::')[0];
const kName = k => k.split('::')[1];
const kData = k => window.NCEA_DATA[kLvl(k)];

const MAX_SUBJECTS = 6;
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HUES = ['#7900CC','#007040','#9F1559','#22229D','#DB2026','#9A6300'];

const S = {
  level: '3',
  faculty: null,
  subjects: [],
  standards: {},
  exams: {},
  /* How much study is possible changes across the year, so availability
     is stored as PERIODS rather than one weekly pattern. Defaults follow
     the Waiheke calendar: holidays 26 Sep to 11 Oct, last day of school
     5 Nov, study leave from the 6th. */
  periods: [
    { name:'Term-time',      start:'2026-08-11', end:'2026-09-25', hours:[1,1,1,1,1,2,0] },
    { name:'Holidays',       start:'2026-09-26', end:'2026-10-11', hours:[3,3,3,0,3,3,0] },
    { name:'Back at school', start:'2026-10-12', end:'2026-11-05', hours:[2,2,2,2,1,3,0] },
    { name:'Study leave',    start:'2026-11-06', end:'2026-12-04', hours:[5,5,5,5,5,3,0] }
  ],
  blackouts: [],
  plan: null,
  view: 'week',
  fullMode: 'subject',      // 'subject' matrix or 'calendar' months
  withTopics: true,         // allocate specific topics inside each standard
  howMode: 'ai',            // 'ai' | 'mix' | 'offline' | 'none'
  armed: null,              // subject picked from the tab bar, ready to place
  examsConfirmed: false,    // student has checked the dates against NZQA
  pickerOpen: false,        // the days-off calendar
  pickerMonth: null,
  cursor: null
};

/* ---------- saving between visits ----------
   Everything lives on the student's own device. No account, nothing sent
   anywhere. The plan is stored in a compact form and rebuilt on load. */
const STORE = 'whs_tt_v1';
function save(){
  try {
    localStorage.setItem(STORE, JSON.stringify({
      level:S.level, faculty:S.faculty, subjects:S.subjects,
      standards: Object.fromEntries(Object.entries(S.standards).map(([k,v]) => [k, [...v]])),
      exams:S.exams, periods:S.periods, blackouts:S.blackouts,
      withTopics:S.withTopics, howMode:S.howMode, examsConfirmed:S.examsConfirmed,
      view:S.view, fullMode:S.fullMode, cursor:S.cursor,
      plan: S.plan ? S.plan.open.map(x => x.item
        ? { d:x.date, i:x.index, e:x.extra?1:0, s:x.item.subject, c:x.item.st.code, m:x.item.mode, t:x.item.topic||'' }
        : { d:x.date, i:x.index, e:x.extra?1:0 }) : null
    }));
  } catch(e){ /* private browsing, quota — not worth interrupting the student */ }
}
function load(){
  let raw; try { raw = localStorage.getItem(STORE); } catch(e){ return false; }
  if(!raw) return false;
  try {
    const o = JSON.parse(raw);
    Object.assign(S, {
      level:o.level||'3', faculty:o.faculty, subjects:o.subjects||[],
      exams:o.exams||{}, periods:o.periods||S.periods, blackouts:o.blackouts||[],
      withTopics: o.withTopics !== false, howMode:o.howMode||'ai',
      examsConfirmed: !!o.examsConfirmed, view:o.view||'week',
      fullMode:o.fullMode||'subject', cursor:o.cursor||todayISO()
    });
    S.standards = {};
    Object.entries(o.standards||{}).forEach(([k,v]) => S.standards[k] = new Set(v));
    S.savedPlan = o.plan || null;

    /* Timetables saved before subjects were keyed by level hold plain names
       like "Geography". Migrate them to "3::Geography" using the level they
       were saved at, otherwise nothing resolves and the plan cannot build. */
    if(S.subjects.some(x => x.indexOf('::') === -1)){
      const lvl = S.level || '3';
      const fix = n => n.indexOf('::') === -1 ? lvl + '::' + n : n;
      S.subjects = S.subjects.map(fix);
      const std = {}, ex = {};
      Object.entries(S.standards).forEach(([k,v]) => std[fix(k)] = v);
      Object.entries(S.exams).forEach(([k,v]) => ex[fix(k)] = v);
      S.standards = std; S.exams = ex;
      if(S.savedPlan) S.savedPlan.forEach(b => { if(b.s) b.s = fix(b.s); });
      if(S.armed) S.armed = fix(S.armed);
    }
    return true;
  } catch(e){ return false; }
}
function rehydrate(){
  if(!S.savedPlan || !window.NCEA_DATA) return;
  // every level referenced by the plan has to be loaded before it can be rebuilt
  const levels = [...new Set(S.subjects.map(kLvl))];
  if(levels.some(l => !window.NCEA_DATA[l])) return;
  const open = S.savedPlan.map(x => {
    const slot = { date:x.d, index:x.i, item:null, extra: !!x.e };
    if(x.s && kData(x.s) && kData(x.s).subjects[kName(x.s)]){
      const st = kData(x.s).subjects[kName(x.s)].standards.find(y => y.code === x.c);
      if(st) slot.item = { subject:x.s, st, mode:x.m, topic:x.t||'' };
    }
    return slot;
  });
  S.plan = { open, items: chosenStandards(), used: open.filter(o=>o.item).length };
  S.savedPlan = null;
}
function wipe(){
  try { localStorage.removeItem(STORE); } catch(e){}
  S.faculty=null; S.subjects=[]; S.standards={}; S.exams={}; S.blackouts=[];
  S.plan=null; S.savedPlan=null; S.armed=null; S.cursor=todayISO();
}

/* ---------- dates ----------
   All date maths runs in UTC. Parsing 'YYYY-MM-DD' as local time and then
   calling toISOString() shifts the result back a day everywhere east of
   Greenwich — in New Zealand that made addDays() return the same date and
   the whole plan collapsed onto day one. ---------------------------------*/
const iso = d => d.toISOString().slice(0,10);
function parse(s){ const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); }
function todayISO(){
  const n = new Date();                       // local calendar day, not UTC's
  return [n.getFullYear(), String(n.getMonth()+1).padStart(2,'0'),
          String(n.getDate()).padStart(2,'0')].join('-');
}
function addDays(s,n){ const d = parse(s); d.setUTCDate(d.getUTCDate()+n); return iso(d); }
function addMonths(s,n){ const d = parse(s); d.setUTCMonth(d.getUTCMonth()+n); return iso(d); }
function wdIndex(s){ return (parse(s).getUTCDay()+6)%7; }
function pretty(s,opt){
  return parse(s).toLocaleDateString('en-NZ',
    Object.assign({ timeZone:'UTC' }, opt || { weekday:'short', day:'numeric', month:'short' }));
}
function monthStart(s){ const d = parse(s); d.setUTCDate(1); return iso(d); }
function monthOf(s){ return parse(s).getUTCMonth(); }
function weekStart(s){ return addDays(s, -wdIndex(s)); }
function daysBetween(a,b){ return Math.round((parse(b)-parse(a))/86400000); }

function periodFor(date){ return S.periods.find(p => date >= p.start && date <= p.end) || null; }
function isExamDay(date){
  // Portfolio submission days are not exam days — you can still work that day.
  return S.subjects.some(sub => S.exams[sub] && !S.exams[sub].portfolio && S.exams[sub].date === date);
}
function hoursOn(date){
  if(S.blackouts.includes(date)) return 0;
  // Exam days are for sitting exams. Nothing gets scheduled on them.
  if(isExamDay(date)) return 0;
  const p = periodFor(date);
  return p ? (p.hours[wdIndex(date)] || 0) : 0;
}
function planStart(){ return S.periods.length ? S.periods.map(p=>p.start).sort()[0] : todayISO(); }
function hueFor(sub){ return HUES[S.subjects.indexOf(sub) % HUES.length]; }

/* ---------- selections ---------- */
function externalSubjects(){
  if(!D()) return [];
  return Object.entries(D().subjects)
    .filter(([,s]) => s.standards.some(x => x.mode === 'external'))
    .map(([n]) => n).sort();
}
function externalStandards(k){
  const d = kData(k); if(!d) return [];
  const sub = d.subjects[kName(k)]; if(!sub) return [];
  return sub.standards.filter(x => x.mode === 'external')
    .sort((a,b) => a.ref.localeCompare(b.ref, undefined, {numeric:true}));
}
// What to show on screen: "Biology" at one level, "Biology (Scholarship)" when mixed.
function label(k){
  const mixed = new Set(S.subjects.map(kLvl)).size > 1;
  return mixed ? kName(k) + ' (' + (kLvl(k)==='S' ? 'Schol' : 'L'+kLvl(k)) + ')' : kName(k);
}
function chosenStandards(){
  const out = [];
  S.subjects.forEach(k => externalStandards(k).forEach(st => {
    if(S.standards[k] && S.standards[k].has(st.code))
      out.push({ subject: k, st, exam: S.exams[k] });
  }));
  return out;
}
function lastExamDate(){
  const d = S.subjects.map(s => S.exams[s] && S.exams[s].date).filter(Boolean).sort();
  return d.length ? d[d.length-1] : null;
}
/* ============================================================
   THE ALLOCATOR
   ============================================================ */

// Every study block the student has time for, in order.
function buildSlots(){
  const end = lastExamDate();
  if(!end) return [];
  const slots = [];
  let day = planStart();
  let guard = 0;
  while(day <= end && guard++ < 500){
    const before = day;
    // hoursOn() already returns 0 for a blackout or a day outside every period,
    // so an unavailable day simply produces no slots at all.
    const hrs = hoursOn(day);
    for(let h = 0; h < hrs; h++) slots.push({ date: day, index: h, item: null });
    day = addDays(day, 1);
    if(day === before) break;      // date maths failed; stop rather than loop
  }
  return slots;
}

// A slot is usable for a standard only if it falls before that exam.
// Morning exams rule out the whole day; afternoon exams leave the morning.
function slotBeforeExam(slot, exam){
  if(!exam || !exam.date) return true;
  if(slot.date < exam.date) return true;
  if(slot.date > exam.date) return false;
  return exam.session === 'PM' && slot.index === 0;
}

function generate(){
  const items = chosenStandards();
  const open = buildSlots();
  if(!items.length || !open.length) return null;

  items.forEach(i => { i.deadline = open.filter(s => slotBeforeExam(s, i.exam)).length; });

  // Blocks are weighted by credits AND by how much of the plan each standard
  // can actually use. Weighting on credits alone leaves a subject examined
  // late with nothing to do in its final week, because its allocation is
  // spread thin across a much longer window.
  // Scholarship standards carry no credits, so fall back to an equal weight.
  const wt = i => (i.st.credits || 5) * (i.deadline / open.length);
  const totalWeight = items.reduce((a,i) => a + wt(i), 0) || 1;
  items.forEach(i => {
    const share = wt(i) / totalWeight;
    i.blocks = Math.max(3, Math.round(open.length * share));
  });

  // Trim proportionally if we have asked for more than the student has time for.
  let asked = items.reduce((a,i) => a + i.blocks, 0);
  if(asked > open.length){
    const scale = open.length / asked;
    items.forEach(i => { i.blocks = Math.max(2, Math.floor(i.blocks * scale)); });
  }

  // Spread each standard's blocks evenly across the time available to it,
  // rather than bunching them — this is the spacing effect doing the work.
  const wanted = [];
  items.forEach(i => {
    const room = Math.max(1, i.deadline - 1);
    // Work through the standard's own topic list in order, then loop.
    const topics = (S.withTopics && i.st.topics && i.st.topics.length) ? i.st.topics : [];
    for(let n = 0; n < i.blocks; n++){
      const pos = Math.round(((n + 0.5) / i.blocks) * room);
      const phase = n / i.blocks;
      wanted.push({
        item: i,
        target: Math.min(pos, i.deadline - 1),
        mode: phase < 0.34 ? 'explainer' : phase < 0.72 ? 'exam' : 'recall',
        topic: topics.length ? topics[n % topics.length] : ''
      });
    }
  });

  // Place each wanted block at the nearest free slot that is still before its
  // exam, preferring not to repeat the same subject back to back.
  wanted.sort((a,b) =>
    a.item.deadline - b.item.deadline ||   // tightest deadline first
    b.target - a.target);                  // then latest blocks first
  const filled = new Array(open.length).fill(null);
  wanted.forEach(w => {
    let best = -1, bestScore = Infinity;
    for(let d = 0; d < open.length; d++){
      for(const p of [w.target - d, w.target + d]){
        if(p < 0 || p >= open.length || p >= w.item.deadline) continue;
        if(filled[p]) continue;
        const clash = (filled[p-1] && filled[p-1].subject === w.item.subject) ||
                      (filled[p+1] && filled[p+1].subject === w.item.subject);
        const sameDay = (filled[p-1] && open[p-1].date === open[p].date &&
                         filled[p-1].subject === w.item.subject);
        const score = d + (clash ? 6 : 0) + (sameDay ? 6 : 0);
        if(score < bestScore){ bestScore = score; best = p; }
      }
      // keep looking a little past the first hit, but do not scan the whole plan
      if(best >= 0 && d > bestScore + 8) break;
    }
    if(best >= 0) filled[best] = { subject: w.item.subject, st: w.item.st, mode: w.mode, topic: w.topic };
  });

  // The day before an exam belongs to that subject: relabel anything there.
  items.forEach(i => {
    if(!i.exam || !i.exam.date) return;
    // the last day that actually has study slots before this exam
    let eve = addDays(i.exam.date, -1);
    let back = 0;
    while(back++ < 10 && !open.some(o => o.date === eve)) eve = addDays(eve, -1);
    open.forEach((slot, n) => {
      if(slot.date === eve && filled[n] && filled[n].subject !== i.subject && !filled[n].locked){
        // only take the slot if that subject has time left elsewhere
        filled[n] = { subject: i.subject, st: i.st, mode: 'recall', eve: true, locked: true };
      }
    });
  });

  open.forEach((slot, n) => { slot.item = filled[n]; });
  S.cursor = S.cursor || todayISO();
  return { open, items, used: filled.filter(Boolean).length };
}
/* ============================================================
   NON-AI STUDY METHODS
   Every block can be done without a screen. Methods are chosen by
   what the block is for (learn / practise / drill) and by how the
   subject actually works, so a Calculus block gets worked problems
   and a History block gets an essay plan.
   ============================================================ */
const SUBJECT_TYPE = {
  'Calculus':'quant', 'Statistics':'quant', 'Mathematics and Statistics':'quant',
  'Physics':'quant', 'Chemistry':'quant', 'Physics, Earth and Space Science':'quant',
  'Biology':'science', 'Earth & Space Science':'science', 'Science':'science',
  'Chemistry and Biology':'science', 'Psychology':'science',
  'English':'essay', 'History':'essay', 'Classical Studies':'essay',
  'Art History':'essay', 'Media Studies':'essay', 'Drama':'essay', 'Music':'essay',
  'Geography':'evidence', 'Business Studies':'evidence', 'Commerce':'evidence',
  'Health':'evidence', 'Health Studies':'evidence', 'Physical Education':'evidence',
  'Te Reo Māori':'language', 'Te Ao Haka':'language',
  'Digital Technologies':'science'
};
const typeOf = sub => SUBJECT_TYPE[sub] || 'evidence';

const METHODS = {
  explainer: {
    quant: [
      'Work through the examples in your textbook or workbook with the answers covered, then check.',
      'Write the method out as numbered steps in your own words, then do one question following only your steps.',
      'Take a worked example from class and redo it with different numbers you make up.',
      'Make a one-page formula sheet from memory, then fill the gaps from your notes in a different colour.'
    ],
    science: [
      'Draw the process as a labelled diagram from memory, then correct it against your notes in another colour.',
      'Turn your class notes into Cornell notes — cues down the left, summary at the bottom.',
      'Write a one-page summary of this topic without looking, then highlight what you had to leave out.',
      'Explain the mechanism out loud to someone at home, or to an empty room. Where you stumble is what to reread.'
    ],
    essay: [
      'Reread the key section of the text and write ten quotations with a line on what each shows.',
      'Build a mind map of the ideas, with evidence hanging off each branch.',
      'Write a one-page summary of this aspect in your own words, no notes open.',
      'Teach this idea to someone for five minutes. What you cannot explain simply, you do not have yet.'
    ],
    evidence: [
      'Make a case-study fact sheet: names, figures, dates, places. One page, no sentences.',
      'Draw the process or issue as a flow diagram showing cause and effect.',
      'Write a one-page summary from memory, then add what you missed in a different colour.',
      'Explain this to a family member and get them to ask you why after every sentence.'
    ],
    language: [
      'Kōrero: say the new structures aloud twenty times until they stop feeling foreign.',
      'Write out the sentence patterns by hand, then build five of your own from each.',
      'Read a short passage aloud, then retell it in your own words without looking.',
      'Make vocabulary cards with the word on one side and a full sentence on the other.'
    ]
  },
  exam: {
    quant: [
      'Do a past paper question under time, then mark it against the assessment schedule.',
      'Redo three questions you got wrong last time, from scratch, without looking at the working.',
      'Set yourself six questions of increasing difficulty and do them in one sitting.',
      'Do a full past paper section under exam conditions — no notes, timer on, phone in another room.'
    ],
    science: [
      'Do a past paper question, then mark it against the assessment schedule and write what you missed.',
      'Practise annotated diagrams under time — the marks are in the labels, not the drawing.',
      'Answer one Excellence-level question and check whether you actually justified rather than described.',
      'Work through a resource-based question using only the resource, not your memory.'
    ],
    essay: [
      'Write an essay plan for a past exam question in fifteen minutes — thesis, three points, evidence for each.',
      'Write one full paragraph under time, then check it has a claim, evidence and an explanation of effect.',
      'Take a past question and write three different opening paragraphs, then pick the strongest.',
      'Write a full essay under exam conditions, then mark it against the assessment schedule.'
    ],
    evidence: [
      'Answer a past paper question, then check every claim you made has a name, figure or date attached.',
      'Write a full explanation under time, then underline where you explained rather than described.',
      'Practise the resource-based skills: read the figures off the graph, state the units, interpret in context.',
      'Take a past question and write the Excellence sentence only — the one that evaluates or justifies.'
    ],
    language: [
      'Write a response to a past exam prompt under time, then check macrons and tense markers.',
      'Practise a five-minute conversation with someone, unscripted, on this topic.',
      'Read an unfamiliar passage and answer questions on it without a dictionary.',
      'Write the same idea three ways, using a different structure each time.'
    ]
  },
  recall: {
    quant: [
      'Blurting: write down every formula and method for this topic from memory, then check and fill gaps.',
      'Flashcards for formulae and conditions — which method suits which situation.',
      'Cover the worked example, do it, uncover, compare. Repeat until it is automatic.',
      'Quick-fire: twenty short questions, no working, just the method you would use.'
    ],
    science: [
      'Blurting: write everything you know about this topic on a blank page, then check what you missed.',
      'Flashcards for terminology and processes. Test yourself both ways round.',
      'Recite the process aloud from memory, in order, without prompts.',
      'Redraw the key diagram from memory and label it fully.'
    ],
    essay: [
      'Blurting: write down every quotation and technique you can remember, then check the text.',
      'Flashcards with the quotation on one side and its effect on the other.',
      'Recite your essay plan from memory — thesis, points, evidence.',
      'Test a classmate on their text and let them test you on yours.'
    ],
    evidence: [
      'Blurting: write every fact, figure and date for this case study from memory, then check.',
      'Flashcards for case-study specifics. Vague answers do not count — push for the number.',
      'Recite the case study aloud to someone and have them check your figures against your notes.',
      'Cover your fact sheet and rebuild it on a blank page.'
    ],
    language: [
      'Vocabulary drill — cover and recall, both directions.',
      'Say the structures aloud from memory, then check against your notes.',
      'Write out five sentences from memory using this week\u2019s patterns.',
      'Listen to a waiata or recording and write down what you understand, then check.'
    ]
  }
};

function methodFor(item, slotIndex){
  const pool = (METHODS[item.mode] || METHODS.explainer)[typeOf(item.subject)] ||
               METHODS[item.mode].evidence;
  // stable choice, so the same block does not change method on every re-render
  const pick = (item.st.code.charCodeAt(3) + slotIndex) % pool.length;
  return pool[pick];
}

/* Most students open a planner wanting one answer: what now. */
function nextBlock(){
  if(!S.plan) return null;
  const now = todayISO();
  return S.plan.open.find(x => x.item && x.date >= now) || null;
}

/* ---------- exam clashes ----------
   The dates are known, so tell the student before they build a plan that
   two of their exams share a day or a session. ------------------------- */
function clashes(){
  const byDay = {};
  S.subjects.forEach(k => {
    const e = S.exams[k];
    if(!e || !e.date || e.portfolio) return;
    (byDay[e.date] = byDay[e.date] || []).push({ k, session: e.session });
  });
  const out = [];
  Object.entries(byDay).forEach(([date, list]) => {
    if(list.length < 2) return;
    const same = list.filter(x => x.session === 'AM').length > 1 ||
                 list.filter(x => x.session === 'PM').length > 1;
    out.push({ date, list, same });
  });
  return out.sort((a,b) => a.date.localeCompare(b.date));
}

function clashNotes(){
  const c = clashes();
  if(!c.length) return '';
  return c.map(x => {
    const names = x.list.map(i => label(i.k) + ' ' + i.session).join(' and ');
    return `<div class="tt-note ${x.same ? 'bad' : 'warn'}">
      <strong>${pretty(x.date, {weekday:'long', day:'numeric', month:'long'})}:</strong>
      ${names}. ${x.same
        ? 'Two exams in the same session is not possible — check your dates, and talk to your school if it is right.'
        : 'Two exams in one day. Your plan front-loads both, but that is a heavy day — make sure you are rested.'}</div>`;
  }).join('');
}

/* ---------- realism ---------- */
function realism(){
  const end = lastExamDate();
  if(!end) return { notes:[], total:0, weeks:0, n:0 };
  const notes = [];
  S.periods.forEach(p => {
    const w = p.hours.reduce((a,b)=>a+b,0);
    if(w > 35) notes.push({ tone:'warn',
      text:`${p.name} is set to ${w} hours a week. Even on study leave that is very hard to hold — 25 to 30 with rest built in is a pace people actually keep.` });
    if(p.hours.every(h => h > 0)) notes.push({ tone:'warn',
      text:`${p.name} has no day off. Build in at least one — rest is part of the plan, not a failure of it.` });
    if(p.start > p.end) notes.push({ tone:'bad', text:`${p.name} ends before it starts.` });
  });
  const total = buildSlots().length;
  const n = chosenStandards().length;
  if(n && total < n * 3) notes.push({ tone:'bad',
    text:`${n} standards need more time than you have set. Add hours, or drop a standard you are less worried about.` });
  return { notes, total, n, weeks: Math.max(1, Math.round(daysBetween(planStart(), end)/7)) };
}

/* Choosing sensibly when a student drops a subject onto a day: take the
   standard that currently has the least time, and set the mode by how close
   the exam is. */
function pickStandardFor(subject, slot){
  const mine = chosenStandards().filter(x => x.subject === subject);
  if(!mine.length) return null;
  const count = {};
  S.plan.open.forEach(x => { if(x.item && x.item.subject === subject)
    count[x.item.st.code] = (count[x.item.st.code]||0)+1; });
  return mine.sort((a,b) => (count[a.st.code]||0) - (count[b.st.code]||0))[0].st;
}
/* Add an hour to a day that is already full. This deliberately goes beyond
   the hours set for that period — a student who wants one more session on a
   Tuesday should be able to have it, and the day shows it is over plan. */
function addHourTo(date){
  if(!S.plan) return;
  if(isExamDay(date)){
    alert('You sit an exam that day — the plan keeps exam days clear.');
    return;
  }
  let last = -1, maxIdx = -1;
  S.plan.open.forEach((x,n) => { if(x.date === date){ last = n; maxIdx = Math.max(maxIdx, x.index); } });
  const slot = { date, index: maxIdx + 1, item: null, extra: true };
  if(last === -1){
    // the day had no slots at all — drop it in date order
    let at = S.plan.open.findIndex(x => x.date > date);
    if(at === -1) at = S.plan.open.length;
    S.plan.open.splice(at, 0, slot);
    last = at - 1;
  } else {
    S.plan.open.splice(last + 1, 0, slot);
  }
  if(S.armed) placeInto(last + 1);
  else { save(); render(); }
}

function placeInto(n){
  if(!S.armed || !S.plan) return;
  const slot = S.plan.open[n];
  const st = pickStandardFor(S.armed, slot);
  if(!st) return;
  const topics = (S.withTopics && st.topics && st.topics.length) ? st.topics : [];
  slot.item = { subject:S.armed, st, mode: modeForDate(slot.date, S.armed),
                topic: topics.length ? topics[n % topics.length] : '' };
  S.plan.used = S.plan.open.filter(x=>x.item).length;
  save(); render();
}

function modeForDate(date, subject){
  const ex = S.exams[subject];
  if(!ex || !ex.date) return 'explainer';
  const left = daysBetween(date, ex.date);
  return left <= 7 ? 'recall' : left <= 21 ? 'exam' : 'explainer';
}

function dayCapacity(date){
  if(!S.plan) return '';
  const on = S.plan.open.filter(x => x.date === date);
  const planned = hoursOn(date);
  const extra = on.filter(x => x.extra).length;
  if(isExamDay(date)) return `<p class="tt-cap tt-over">Exam day — nothing scheduled.</p>`;
  if(!on.length && !planned) return '';
  return `<p class="tt-cap${extra?' tt-over':''}">${on.length} hour${on.length===1?'':'s'} on this day` +
    (extra ? ` — ${extra} more than you planned for` : planned ? '' : ' — a day you had set aside') + `</p>`;
}

/* The exam itself, drawn in the subject colour so it reads as the deadline
   every block before it is working toward. */
function examBanner(date, size){
  const sitting = S.subjects.filter(s => S.exams[s] && S.exams[s].date === date);
  const isPf = sub => S.exams[sub] && S.exams[sub].portfolio;
  const eve     = S.subjects.filter(s => S.exams[s] && addDays(S.exams[s].date,-1) === date);
  if(!sitting.length && !eve.length) return '';

  const time = sub => (E().sessions.find(x => x.id === S.exams[sub].session) || {}).start || '';
  const out = [];

  sitting.forEach(sub => {
    const word = isPf(sub) ? 'DUE' : 'EXAM';
    const when = isPf(sub) ? 'Portfolio submission'
      : ((E().sessions.find(x=>x.id===S.exams[sub].session)||{}).label||'') + ' · ' + time(sub);
    if(size === 'xs') out.push(
      `<span class="tt-exam-xs" title="${label(sub)} — ${when}">${label(sub)}</span>`);
    else if(size === 'sm') out.push(
      `<div class="tt-exambar tt-exam-sm"><strong>${label(sub)}</strong><span>${word}${isPf(sub)?'':' '+S.exams[sub].session+' '+time(sub)}</span></div>`);
    else out.push(
      `<div class="tt-exambar"><span class="tt-exampill">${word}</span><strong>${label(sub)}</strong>
        ${sittingChip(sub,'sm')}<span class="tt-examwhen">${when}</span></div>`);
  });

  // The night before is its own kind of day — same gold, quieter treatment,
  // and it names the subject so the student knows what to be revising.
  eve.filter(sub => !sitting.includes(sub)).forEach(sub => {
    if(size === 'xs') out.push(`<span class="tt-eve-xs" title="${label(sub)} exam tomorrow">${label(sub)} eve</span>`);
    else if(size === 'sm') out.push(`<div class="tt-evebar tt-exam-sm"><strong>${label(sub)}</strong><span>EXAM TOMORROW</span></div>`);
    else out.push(`<div class="tt-evebar"><span class="tt-exampill">TOMORROW</span><strong>${label(sub)}</strong>
      <span class="tt-examwhen">Last chance to revise</span></div>`);
  });

  return out.join('');
}

/* Digital or paper changes how you should practise, so it travels with the
   exam date rather than being buried in the standard text. */
function sittingOf(k){
  const e = S.exams[k];
  if(e && e.sitting) return e.sitting;
  return E().sittingFor(kLvl(k), kName(k));
}
function sittingChip(k, size){
  const v = sittingOf(k);
  if(!v) return '';
  const txt = v === 'digital' ? 'Digital exam' : v === 'performance' ? 'Recorded performance' : 'Paper exam';
  return `<span class="tt-sit tt-sit-${v}${size==='sm'?' tt-sit-sm':''}">${txt}</span>`;
}

const modeLabel = m => ({ explainer:'Learn it', exam:'Practise it', recall:'Drill it' })[m] || m;
const blocksOn = d => S.plan ? S.plan.open.filter(s => s.date === d && s.item) : [];
const examsOn  = d => S.subjects.filter(s => S.exams[s] && S.exams[s].date === d);

/* ============================================================
   VIEWS — long views show colour only, short views show detail
   ============================================================ */
function viewBar(){
  const views = [['day','Day'],['week','Week'],['month','Month'],['full','Full plan']];
  // NB: not called `label` — that would shadow the label() helper used below.
  const heading = S.view==='day'   ? pretty(S.cursor,{weekday:'long',day:'numeric',month:'long'})
              : S.view==='week'  ? 'Week of ' + pretty(weekStart(S.cursor))
              : S.view==='month' ? pretty(S.cursor,{month:'long',year:'numeric'})
              : 'Whole plan';
  return `<div class="tt-viewbar">
    <div class="flex gap-1 items-center">${views.map(([v,l])=>
      `<button class="tt-view" data-v="${v}" aria-pressed="${S.view===v}">${l}</button>`).join('')}
      <button id="tt-regen" class="tt-regenbtn" title="Build the plan again from scratch">Regenerate</button></div>
    ${S.view!=='full' ? `<div class="tt-nav">
      <button class="tt-arrow" data-step="-1">&lsaquo;</button>
      <span class="tt-navlabel">${heading}</span>
      <button class="tt-arrow" data-step="1">&rsaquo;</button>
      <button class="tt-today">Today</button></div>`
      : `<span class="tt-navlabel">${heading}</span>`}
    <div class="tt-legend">${S.subjects.map(s=>
      `<span class="tt-key"><i style="background:${hueFor(s)}"></i>${label(s)}</span>`).join('')}</div>
  </div>`;
}

function blockHTML(slot, n){
  const it = slot.item;
  const q = `?level=${kLvl(it.subject)}&subject=${encodeURIComponent(kName(it.subject))}&std=${it.st.code}&mode=${it.mode}` +
            (it.topic ? `&topic=${encodeURIComponent(it.topic)}` : '');
  /* In Mix, alternate deterministically so the same block always shows the
     same thing — about half AI, half off-screen, for variety rather than a
     diet of one or the other. */
  const aiTurn = S.howMode === 'ai' ||
    (S.howMode === 'mix' && (n + it.st.code.charCodeAt(4)) % 2 === 0);
  const showsMethod = S.howMode === 'offline' || (S.howMode === 'mix' && !aiTurn);

  const actions = S.howMode === 'none' ? ''
    : aiTurn
      ? `<div class="tt-acts">
           <a class="tt-open" href="${q}" title="Open this in the prompt builder">Open &#8599;</a>
           <button class="tt-gem" data-sub="${encodeURIComponent(it.subject)}" data-code="${it.st.code}"
             data-mode="${it.mode}" data-topic="${encodeURIComponent(it.topic||'')}"
             title="Copy the prompt and open Gemini">Gemini &#8599;</button>
         </div>`
      : `<div class="tt-how">${methodFor(it, n)}</div>`;

  return `<div class="tt-block${showsMethod?' tt-offline':''}${slot.extra?' tt-extra':''}" style="--hue:${hueFor(it.subject)}">
    <button class="tt-del" data-slot="${n}" title="Clear this block">&times;</button>
    <div class="tt-bmeta"><strong>${label(it.subject)}</strong> · ${it.st.credits?'AS':''}${it.st.code}
      <span class="tt-mode">${modeLabel(it.mode)}</span></div>
    <div class="tt-btitle">${it.topic ? it.topic : it.st.title}</div>
    ${actions}</div>`;
}

/* An unused slot is a place the student can drop a subject into. */
function emptyHTML(n){
  return `<button class="tt-slot" data-empty="${n}" title="${S.armed ? 'Place ' + label(S.armed) + ' here' : 'Pick a subject above first'}">+</button>`;
}

function dayView(){
  const d = S.cursor;
  const b = S.plan ? S.plan.open.map((s,n)=>({s,n})).filter(x => x.s.date === d) : [];
  return `<div class="tt-dayview">
    ${examBanner(d)}
    ${b.length ? b.map(x => x.s.item ? blockHTML(x.s, x.n) : emptyHTML(x.n)).join('')
      : `<p class="text-sm soft mb-2">Nothing planned for this day.</p>`}
    ${dayCapacity(d)}
    <button class="tt-addhr" data-date="${d}">${S.armed ? '+ Add ' + label(S.armed) + ' here' : '+ Add another hour'}</button>
  </div>`;
}

function weekView(){
  const start = weekStart(S.cursor);
  return `<div class="tt-week">${WEEKDAYS.map((w,i)=>{
    const d = addDays(start,i), ex = examsOn(d);
    const b = S.plan ? S.plan.open.map((s,n)=>({s,n})).filter(x => x.s.date === d) : [];
    return `<div class="tt-wday${d===todayISO()?' tt-today-col':''}">
      <div class="tt-wdh">${w}<span>${pretty(d,{day:'numeric',month:'short'})}</span></div>
      ${examBanner(d,'sm')}
      ${b.length ? b.map(x => x.s.item ? blockHTML(x.s, x.n) : emptyHTML(x.n)).join('') : `<p class="tt-empty">&mdash;</p>`}
      <button class="tt-addhr tt-addsm" data-date="${d}" title="${S.armed ? 'Add '+label(S.armed)+' to this day' : 'Add another hour to this day'}">+</button>
    </div>`;
  }).join('')}</div>`;
}

function monthView(anchor){
  const first = monthStart(anchor || S.cursor), lead = wdIndex(first);
  const m = monthOf(first);
  const cells = new Array(lead).fill(null);
  let d = first;
  while(monthOf(d) === m){ cells.push(d); d = addDays(d,1); }
  return `<div class="tt-monthwrap">
    <p class="tt-mtitle">${pretty(first,{month:'long', year:'numeric'})}</p>
    <div class="tt-month">
    ${WEEKDAYS.map(w=>`<div class="tt-mh">${w}</div>`).join('')}
    ${cells.map(c=>{
      if(!c) return `<div class="tt-mcell tt-mout"></div>`;
      const ex = examsOn(c);
      const rows = S.plan ? S.plan.open.map((x,n)=>({x,n})).filter(o => o.x.date === c) : [];
      const chips = rows.map(o => o.x.item
        ? `<span class="tt-mname" style="--hue:${hueFor(o.x.item.subject)}" title="${label(o.x.item.subject)} — ${o.x.item.st.code}">
             ${label(o.x.item.subject)}<button class="tt-del tt-mdel" data-slot="${o.n}" title="Clear">&times;</button></span>`
        : `<button class="tt-mslot" data-empty="${o.n}" title="${S.armed?'Place '+label(S.armed)+' here':'Pick a subject above first'}">+</button>`
      ).join('');
      return `<div class="tt-mcell${c===todayISO()?' tt-today-cell':''}${ex.length?' tt-mexamday':''}">
        <span class="tt-mnum" data-goto="${c}" title="Open this day">${+c.slice(8)}</span>
        ${examBanner(c,'xs')}
        <div class="tt-mnames">${chips}</div>
        <button class="tt-addhr tt-maddhr" data-date="${c}" title="${S.armed ? 'Add '+label(S.armed) : 'Add another hour'}">+</button>
      </div>`;
    }).join('')}
    </div></div>`;
}

function subjectMatrix(){
  const weeks = {};
  S.plan.open.forEach(s => { const w = weekStart(s.date); (weeks[w]=weeks[w]||[]).push(s); });
  const list = Object.keys(weeks).sort();
  let t = `<div class="tt-scroll"><table class="tt-table"><thead><tr><th class="tt-sub">Subject</th>` +
    list.map((w,i)=>`<th>W${i+1}<span class="tt-wk">${pretty(w,{day:'numeric',month:'short'})}</span></th>`).join('') +
    `<th>Exam</th></tr></thead><tbody>`;
  S.subjects.forEach(sub=>{
    t += `<tr><td class="tt-sub"><i class="tt-dot" style="background:${hueFor(sub)}"></i>${label(sub)}</td>`;
    const exDate = S.exams[sub] && S.exams[sub].date;
    list.forEach(w=>{
      const n = weeks[w].filter(s => s.item && s.item.subject === sub).length;
      const isExamWeek = exDate && exDate >= w && exDate <= addDays(w,6);
      if(isExamWeek){
        t += `<td class="tt-examcell" style="--hue:${hueFor(sub)}" title="${sub} exam this week">
                ${n?n+'h ':''}<span class="tt-examtag">EXAM</span></td>`;
      } else {
        t += `<td class="${n?'tt-has':'tt-none'}"${n?` style="background:color-mix(in srgb,${hueFor(sub)} ${Math.min(55,n*9)}%,transparent)"`:''}>${n?n+'h':'·'}</td>`;
      }
    });
    const e = S.exams[sub];
    t += `<td class="tt-exam">${e&&e.date?pretty(e.date,{day:'numeric',month:'short'})+' '+e.session:'—'}</td></tr>`;
  });
  return t + `</tbody></table></div>
    <p class="text-xs soft mt-2">Hours per week. A pale or empty row means that subject is being neglected.</p>`;
}

function fullCalendar(){
  const dates = S.plan.open.map(s => s.date).sort();
  if(!dates.length) return '';
  let m = monthStart(dates[0]);
  const last = monthStart(dates[dates.length-1]);
  const out = [];
  let guard = 0;
  while(m <= last && guard++ < 18){ out.push(monthView(m)); m = addMonths(m, 1); }
  return `<div class="tt-months">${out.join('')}</div>`;
}

function fullView(){
  return `<div class="tt-fullswitch">
      <button class="tt-fm" data-m="subject" aria-pressed="${S.fullMode==='subject'}">By subject</button>
      <button class="tt-fm" data-m="calendar" aria-pressed="${S.fullMode==='calendar'}">Calendar</button>
    </div>
    ${S.fullMode==='calendar' ? fullCalendar() : subjectMatrix()}`;
}

function renderPlan(){
  const p = S.plan; if(!p) return '';
  const body = S.view==='day' ? dayView() : S.view==='week' ? weekView()
             : S.view==='month' ? monthView() : fullView();
  return `<div class="panel p-4 md:p-5 tt-plan">
    <div class="tt-planhead mb-3">
      <div class="tt-ph-left">
        <div class="tt-how-switch" role="group" aria-label="How to study each block">
          ${[['ai','With AI'],['mix','Mix'],['offline','Without AI'],['none','None']].map(([k,l])=>
            `<button class="tt-hm" data-h="${k}" aria-pressed="${S.howMode===k}">${l}</button>`).join('')}
        </div>
        <span class="text-xs soft">${p.used} blocks</span>
      </div>

      <div class="tt-ph-mid">
        ${nextBlock() ? `<button id="tt-now" class="tt-nowbtn" title="Jump to your next study block">What now?</button>` : ''}
      </div>

      <div class="tt-ph-rt">
        <button id="tt-print"  class="tt-printbtn">Print plan</button>
        <button id="tt-print1" class="tt-printbtn" title="Just the week you are looking at">Print week</button>
        <div class="tt-mini-stack">
          <button id="tt-share" class="tt-minibtn">Share plan</button>
          <button id="tt-ics"   class="tt-minibtn">Add to calendar</button>
        </div>
      </div>
    </div>
    ${viewBar()}
    ${`<div class="tt-armbar">
      <span class="tt-armlabel">${S.armed ? 'Click a + to place ' + label(S.armed) : 'Add a block:'}</span>
      ${S.subjects.map(sub=>`<button class="tt-arm" data-s="${sub}" aria-pressed="${S.armed===sub}"
        style="--hue:${hueFor(sub)}">${label(sub)}</button>`).join('')}
      ${S.armed?`<button class="tt-arm tt-armoff">Cancel</button>`:''}
    </div>`}
    ${body}
  </div>`;
}

/* ---------- calendar file ---------- */
function toICS(){
  const p = S.plan; if(!p) return '';
  const pad = n => String(n).padStart(2,'0');
  const at = (d,h) => d.replace(/-/g,'') + 'T' + pad(h) + '0000';
  const out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WHS//NCEA Master Tutor//EN','CALSCALE:GREGORIAN'];
  p.open.forEach((s,n)=>{
    if(!s.item) return;
    const it = s.item, h = Math.min(21, 16 + s.index);
    const url = location.origin + location.pathname +
      `?level=${kLvl(it.subject)}&subject=${encodeURIComponent(kName(it.subject))}&std=${it.st.code}&mode=${it.mode}`;
    out.push('BEGIN:VEVENT', `UID:whs-${s.date}-${n}@ncea`,
      `DTSTART:${at(s.date,h)}`, `DTEND:${at(s.date,h+1)}`,
      `SUMMARY:${label(it.subject)} — ${it.st.code} (${modeLabel(it.mode)})`,
      `DESCRIPTION:${it.st.title}\\n\\nOpen your prompt: ${url}`, `URL:${url}`, 'END:VEVENT');
  });
  return out.concat('END:VCALENDAR').join('\r\n');
}
/* Print just the plan. Opening a clean window avoids fighting the page's
   own layout and lets the student Save as PDF from the same dialog. */
/* ============================================================
   PRINTING
   A printed plan is a different object from the screen one: you
   cannot navigate it, so it runs the whole period continuously,
   week per page, with a tickbox against every block and room to
   write. Study methods print rather than prompt names — paper is
   by definition the no-screen version.
   ============================================================ */
function printPlan(scope){
  const p = S.plan;
  if(!p) return;

  const today = todayISO();
  const weeks = {};
  p.open.forEach(slot => { const wk = weekStart(slot.date); (weeks[wk] = weeks[wk] || []).push(slot); });
  let keys = Object.keys(weeks).sort();
  if(scope === 'week'){
    const wk = weekStart(S.cursor || today);
    keys = keys.filter(k => k === wk);
    if(!keys.length) keys = [Object.keys(weeks).sort().find(k => k >= weekStart(today)) || Object.keys(weeks).sort()[0]];
  }
  if(!keys.length) return;

  // exams get their own line in the flow, not a separate list
  const examOn = d => S.subjects.filter(x => S.exams[x] && S.exams[x].date === d);

  const firstExam = S.subjects.map(x => S.exams[x] && S.exams[x].date).filter(Boolean).sort()[0];
  const totalHrs  = p.open.filter(x => x.item).length;

  const pages = keys.map((wk, i) => {
    const days = [];
    for(let d = 0; d < 7; d++) days.push(addDays(wk, d));
    const rows = days.map(date => {
      const blocks = weeks[wk].filter(x => x.date === date && x.item);
      const ex = examOn(date);
      if(!blocks.length && !ex.length){
        return `<tr class="pl-off"><td class="pl-day">${pretty(date,{weekday:'short'})}
          <span>${pretty(date,{day:'numeric',month:'short'})}</span></td>
          <td colspan="3" class="pl-none">—</td></tr>`;
      }
      const lines = [];
      ex.forEach(sub => lines.push(
        `<tr class="pl-exam"><td class="pl-tick"></td>
           <td colspan="3"><strong>EXAM — ${label(sub)}</strong>
           ${(E().sessions.find(x=>x.id===S.exams[sub].session)||{}).label||''}
           ${(E().sessions.find(x=>x.id===S.exams[sub].session)||{}).start||''}
           ${sittingOf(sub) ? '&nbsp;·&nbsp;' + ({digital:'DIGITAL EXAM',paper:'PAPER EXAM',performance:'RECORDED PERFORMANCE'}[sittingOf(sub)]||'') : ''}</td></tr>`));
      blocks.forEach(slot => {
        const it = slot.item;
        lines.push(`<tr>
          <td class="pl-tick">&#9744;</td>
          <td class="pl-sub">${label(it.subject)}<span>${it.st.credits?'AS':''}${it.st.code}</span></td>
          <td class="pl-what">
            <strong>${it.topic || it.st.title}</strong>
            <span>${methodFor(it, p.open.indexOf(slot))}</span>
          </td>
          <td class="pl-notes"></td></tr>`);
      });
      const span = lines.length;
      return lines.map((row, n) => n === 0
        ? row.replace('<tr', `<tr`).replace('<td class="pl-tick"',
            `<td class="pl-day" rowspan="${span}">${pretty(date,{weekday:'short'})}<span>${pretty(date,{day:'numeric',month:'short'})}</span></td><td class="pl-tick"`)
        : row).join('');
    }).join('');

    return `<section class="pl-page">
      <header class="pl-head">
        <div>
          <h1>Study plan${keys.length>1?` — week ${i+1} of ${keys.length}`:''}</h1>
          <p>${pretty(wk,{day:'numeric',month:'long'})} to ${pretty(addDays(wk,6),{day:'numeric',month:'long'})}</p>
        </div>
        <div class="pl-meta">
          <p><strong>Name:</strong> ______________________</p>
          <p>${S.subjects.map(label).join(' · ')}</p>
        </div>
      </header>
      <table class="pl-table">
        <thead><tr><th class="pl-day">Day</th><th class="pl-tick">Done</th>
          <th class="pl-sub">Subject</th><th class="pl-what">What to do</th><th class="pl-notes">Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <footer class="pl-foot">Tick each block as you finish it. If you miss one, move it — do not just drop it.</footer>
    </section>`;
  }).join('');

  const w = window.open('', '_blank', 'width=1000,height=900');
  if(!w){ alert('Your browser blocked the print window. Allow pop-ups for this site and try again.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>NCEA study plan</title>
    <style>
      *{ box-sizing:border-box; }
      body{ font-family:'Segoe UI',Arial,sans-serif; color:#111; margin:0; padding:14mm; font-size:11px; }
      .pl-page{ page-break-after:always; }
      .pl-page:last-child{ page-break-after:auto; }
      .pl-head{ display:flex; justify-content:space-between; align-items:flex-start;
        border-bottom:2px solid #111; padding-bottom:6px; margin-bottom:10px; }
      .pl-head h1{ font-size:16px; margin:0 0 2px; }
      .pl-head p{ margin:0; font-size:10px; color:#444; }
      .pl-meta{ text-align:right; }
      .pl-meta p{ margin:0 0 3px; }
      .pl-table{ width:100%; border-collapse:collapse; }
      .pl-table th{ background:#eee; font-size:9px; text-transform:uppercase;
        letter-spacing:.06em; text-align:left; padding:4px 6px; border:1px solid #999; }
      .pl-table td{ border:1px solid #bbb; padding:5px 6px; vertical-align:top; }
      .pl-day{ width:52px; font-weight:700; font-size:10px; background:#f4f4f4; }
      .pl-day span{ display:block; font-weight:400; color:#555; font-size:9px; }
      .pl-tick{ width:34px; text-align:center; font-size:15px; line-height:1; }
      .pl-sub{ width:110px; font-weight:700; }
      .pl-sub span{ display:block; font-weight:400; color:#555; font-size:9px; }
      .pl-what strong{ display:block; font-weight:700; margin-bottom:2px; }
      .pl-what span{ color:#333; font-size:10px; line-height:1.4; }
      .pl-notes{ width:120px; }
      .pl-none{ color:#999; font-style:italic; }
      .pl-off td{ background:#fafafa; }
      .pl-exam td{ background:#f0e2b8; font-size:11px; }
      .pl-foot{ margin-top:8px; font-size:9px; color:#555; border-top:1px solid #ccc; padding-top:4px; }
      @page{ margin:10mm; size:A4 portrait; }
      @media print{ body{ padding:0; } }
    </style></head><body>${pages}</body></html>`);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); }, 500);
}

function download(name,text,type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

load();
// A ?plan= link beats whatever is saved locally — the student clicked it on purpose.
try {
  const code = new URLSearchParams(location.search).get('plan');
  if(code && planFromCode(code)) S.sharedPlan = true;
} catch(e){}
S.cursor = S.cursor || todayISO();

/* ---------- the plan as a link ----------
   Everything needed to rebuild the setup travels in the URL, so a student can
   send their plan to a parent, or move it between phone and laptop. The
   generated blocks are not included — they rebuild from the same inputs. */
function planToCode(){
  const payload = {
    v:1, l:S.level, s:S.subjects,
    d:Object.fromEntries(Object.entries(S.standards).map(([k,v]) => [k,[...v]])),
    e:S.exams, p:S.periods, b:S.blackouts, t:S.withTopics, h:S.howMode
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  } catch(e){ return ''; }
}

function planFromCode(code){
  try {
    const json = decodeURIComponent(escape(
      atob(code.replace(/-/g,'+').replace(/_/g,'/'))));
    const o = JSON.parse(json);
    if(!o || o.v !== 1) return false;
    S.level = o.l || '3';
    S.subjects = o.s || [];
    S.standards = {};
    Object.entries(o.d || {}).forEach(([k,v]) => S.standards[k] = new Set(v));
    S.exams = o.e || {};
    if(o.p) S.periods = o.p;
    S.blackouts = o.b || [];
    S.withTopics = o.t !== false;
    S.howMode = o.h || 'ai';
    S.examsConfirmed = false;      // the recipient confirms the dates themselves
    S.plan = null; S.savedPlan = null;
    return true;
  } catch(e){ return false; }
}

async function copyPlanLink(btn){
  const code = planToCode();
  if(!code) return;
  const url = location.origin + location.pathname + '?plan=' + code;
  try { await navigator.clipboard.writeText(url); }
  catch(e){ window.prompt('Copy this link:', url); return; }
  const o = btn.textContent; btn.textContent = 'Link copied \u2713';
  setTimeout(()=>btn.textContent = o, 1800);
}

/* Levels referenced by a shared plan must be loaded before it can render. */
function levelsNeeded(){ return [...new Set(S.subjects.map(kLvl))]; }

window.Timetable = { open: render, state: S, generate, realism, toICS, reset: wipe,
                     fromCode: planFromCode };

/* ============================================================
   UI
   ============================================================ */
let ttLoading = null;      // level id currently being fetched

/* Fetch each required file in turn and report which ones are actually
   reachable. This turns "it doesn't work" into a specific missing file. */
function diagnose(box){
  if(!box) return;
  if(typeof fetch !== 'function'){ box.innerHTML = ''; return; }
  const files = ['ncea-exams-2026.js','ncea-l1.js','ncea-l2.js','ncea-l3.js','ncea-scholarship.js','timetable.js'];
  box.innerHTML = 'Checking which files are on your site…';
  Promise.all(files.map(f =>
    fetch(f, { method:'GET', cache:'no-store' })
      .then(r => ({ f, ok:r.ok, code:r.status }))
      .catch(() => ({ f, ok:false, code:'no response' }))
  )).then(rows => {
    box.innerHTML = '<strong>Files on your site:</strong><br>' + rows.map(r =>
      `${r.ok ? '\u2713' : '\u2717'} ${r.f}${r.ok ? '' : ' — ' + r.code + (r.code===404?' (MISSING — upload this file)':'')}`
    ).join('<br>');
  }).catch(() => { box.innerHTML = ''; });
}

function render(){
  const root = R();
  if(!root) return;

  // A shared plan can span levels, so load whichever is missing first —
  // the level being browsed, or one referenced by the chosen subjects.
  const need = [S.level].concat(levelsNeeded())
    .find(l => !(window.NCEA_DATA && window.NCEA_DATA[l]));
  if(need){
    const wanted = need;
    root.innerHTML = `<div class="panel p-5"><p class="text-sm">Loading ${wanted==='S'?'Scholarship':'Level '+wanted}…</p></div>`;
    if(ttLoading === wanted) return;            // already on its way
    ttLoading = wanted;

    const src = wanted === 'S' ? 'ncea-scholarship.js' : 'ncea-l' + wanted + '.js';

    const ok   = () => { ttLoading = null; render(); };
    const fail = why => {
      ttLoading = null;
      const url = new URL(src, location.href).href;
      root.innerHTML = stepLevel() + `<div class="panel p-5">
        <p class="text-sm"><strong>The timetable cannot load its data.</strong></p>
        <p class="text-xs soft mt-2">${why}</p>
        <p class="text-xs soft mt-2">It tried to fetch:<br><code style="font-size:11px">${url}</code></p>
        <p class="text-xs soft mt-2">Open that address in a new tab. If it shows
        <em>404</em> or <em>File not found</em>, that file is missing from your site —
        upload it into the same folder as this page.</p>
        <div id="tt-diag" class="text-xs soft mt-3"></div>
        <button id="tt-recheck" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold mt-3">Check again</button>
      </div>`;
      // keep the level pills live so the student can go back to a level that works
      root.querySelectorAll('.tt-lvl').forEach(b => b.onclick = () => {
        S.level = b.dataset.l; S.faculty = null; ttLoading = null; render();
      });
      const rc = root.querySelector('#tt-recheck');
      if(rc) rc.onclick = () => { ttLoading = null; render(); };
      diagnose(root.querySelector('#tt-diag'));
    };

    // Whatever happens, never sit on "Loading…" indefinitely.
    const giveUp = setTimeout(() => {
      if(ttLoading !== wanted) return;
      if(window.NCEA_DATA && window.NCEA_DATA[wanted]) ok();
      else fail('The file did not respond within a few seconds.');
    }, 6000);

    const finish = good => {
      clearTimeout(giveUp);
      if(ttLoading !== wanted) return;
      if(good && window.NCEA_DATA && window.NCEA_DATA[wanted]) ok();
      else fail(good ? 'The file loaded but contained no data for this level.'
                     : 'The file could not be fetched.');
    };

    // Prefer the engine's loader — the prompt builder already uses it, and it
    // handles a file that has been requested once already.
    if(typeof window.nceaLoadLevel === 'function' && wanted !== 'S'){
      window.nceaLoadLevel(wanted).then(() => finish(true)).catch(() => finish(false));
      return;
    }

    const already = [...document.querySelectorAll('script')]
      .find(x => x.src && x.src.indexOf(src) !== -1);
    if(already){
      if(window.NCEA_DATA && window.NCEA_DATA[wanted]){ finish(true); return; }
      already.addEventListener('load', () => finish(true));
      already.addEventListener('error', () => finish(false));
      return;                                   // giveUp covers the silent case
    }

    const t = document.createElement('script');
    t.src = src + '?v=25';
    t.onload  = () => finish(true);
    t.onerror = () => finish(false);
    document.head.appendChild(t);
    return;
  }

  if(S.savedPlan) rehydrate();
  root.innerHTML = intro() + stepLevel() + stepSubjects() + stepStandards() + stepExams() +
                   stepPeriods() + stepGo() + (S.plan ? renderPlan() : '') +
                   `<p class="tt-build">${TT_BUILD}</p>`;
  wire();
  save();
}

/* Shown until a plan exists, so a first-time student knows what this is. */
function intro(){
  if(S.plan) return '';
  return `<div class="tt-intro">
    <p class="tt-intro-h">Build a revision timetable that works backwards from your exams.</p>
    <p class="tt-intro-b">Pick your subjects and standards, check your exam dates, say when you can study —
      then it schedules the lot: spaced out, weighted by credits, and heaviest just before each exam.
      Takes about two minutes, and it saves on this device so you can come back to it.</p>
  </div>`;
}

function stepLevel(){
  if(S.plan && !S.open0) return doneBar('LEVEL',
    [...new Set(S.subjects.map(kLvl))].map(l => l==='S' ? 'Scholarship' : 'Level '+l).join(' · ')
      || (S.level==='S' ? 'Scholarship' : 'Level '+S.level), '0');
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-2">NCEA level</h3>
    <div class="flex flex-wrap gap-2">${[['1','Level 1'],['2','Level 2'],['3','Level 3'],['S','Scholarship']].map(([l,lab])=>
      `<button class="fac-pill lvl-pill tt-lvl" data-l="${l}" aria-pressed="${S.level===l}">${lab}</button>`).join('')}</div>
    <p class="text-xs soft mt-2">Sitting Scholarship as well as Level 3? Build one plan for each — they are different exams on different days.</p>
  </div>`;
}

/* A finished step folds to one line, the way the prompt builder does. */
function doneBar(n, text, id){
  return `<div class="panel p-3"><button class="crumb tt-reopen" data-step="${id}">
    <span class="crumb-tag">${n}</span><span>${text}</span>
    <span class="crumb-edit">Change</span></button></div>`;
}

function stepSubjects(){
  if(S.plan && !S.open1) return doneBar('SUBJECTS',
    S.subjects.map(label).join(' · ') || 'none chosen', '1');
  const all = externalSubjects();
  const facs = D().faculties.filter(f => f.subjects.some(n => all.includes(n)));
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Which subjects are you sitting?</h3>
    <p class="text-xs soft mb-3">Only subjects with external exams appear. Choose up to ${MAX_SUBJECTS}.</p>
    <div class="flex flex-wrap gap-2 mb-3">${facs.map((f,i)=>
      `<button class="fac-pill tt-fac" data-i="${i}" aria-pressed="${S.faculty===i}"
        style="--fac-dark:${f.dark};--fac-light:${f.light}">${f.name}</button>`).join('')}</div>
    ${S.faculty!=null ? `<div class="flex flex-wrap gap-2 mb-3">${
      facs[S.faculty].subjects.filter(n=>all.includes(n)).map(n=>
      `<button class="subj-pill tt-pick" data-n="${n}" aria-pressed="${S.subjects.includes(key(S.level,n))}"
        style="--fac-dark:${facs[S.faculty].dark};--fac-light:${facs[S.faculty].light}">${n}</button>`).join('')}</div>` : ''}
    <div class="tt-basket">${S.subjects.length
      ? S.subjects.map(n=>`<span class="tt-chip" style="background:${hueFor(n)}">${label(n)}<button class="tt-x" data-n="${n}">&times;</button></span>`).join('')
        + `<span class="text-xs soft ml-2">${S.subjects.length} of ${MAX_SUBJECTS}</span>`
      : `<span class="text-xs soft">Nothing chosen yet.</span>`}</div>
  </div>`;
}

function stepStandards(){
  if(!S.subjects.length) return '';
  if(S.plan && !S.open2) return doneBar('STANDARDS',
    chosenStandards().length + ' standards selected', '2');
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Which standards are you sitting?</h3>
    <p class="text-xs soft mb-3">All ticked to start with. Untick anything you are not doing.</p>
    ${S.subjects.map(sub=>`<div class="tt-stdgroup">
      <p class="tt-stdsub" style="color:${hueFor(sub)}">${label(sub)}</p>
      ${externalStandards(sub).map(st=>`<label class="tt-check">
        <input type="checkbox" data-sub="${sub}" data-code="${st.code}"
          ${S.standards[sub]&&S.standards[sub].has(st.code)?'checked':''}>
        <span><strong>AS${st.code}</strong> · ${st.credits} cr — ${st.title}</span></label>`).join('')}
    </div>`).join('')}
  </div>`;
}

function stepExams(){
  if(!S.subjects.length) return '';
  if(S.plan && !S.open4) return doneBar('EXAM DATES',
    S.subjects.map(k => label(k) + ' ' + (S.exams[k] && S.exams[k].date
      ? pretty(S.exams[k].date,{day:'numeric',month:'short'}) : '?')).join(' · '), '4');
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Exam dates</h3>
    <p class="text-xs soft mb-3">Pre-filled from the ${E().year} timetable. Check yours on
      <a href="${E().timetableUrl}" target="_blank" rel="noopener" class="underline">NZQA</a>.
      <strong>Digital exam</strong> or <strong>paper exam</strong> shows how you will sit each one —
      Waiheke enters students digitally wherever NZQA offers it. Ask your teacher if you would prefer paper.</p>
    ${S.subjects.map(sub=>{
      const ex = S.exams[sub]||{};
      // A portfolio subject has no sat examination — the school sets a
      // submission date, so any weekday is valid and there is no session.
      if(ex.portfolio) return `<div class="tt-examrow">
        <span class="tt-examsub"><i class="tt-dot" style="background:${hueFor(sub)}"></i>${label(sub)}</span>
        <input type="date" class="field tt-date" data-sub="${sub}" value="${ex.date||''}">
        <span class="tt-pfolio">Portfolio — enter your submission date</span>
        <span class="tt-warn">${ex.date?'':'No date yet.'}</span></div>`;
      const prob = ex.date ? E().checkDate(ex.date) : 'No date yet.';
      return `<div class="tt-examrow">
        <span class="tt-examsub"><i class="tt-dot" style="background:${hueFor(sub)}"></i>${label(sub)}</span>
        <input type="date" class="field tt-date" data-sub="${sub}" value="${ex.date||''}"
          min="${E().window.start}" max="${E().window.end}">
        <select class="field tt-sess" data-sub="${sub}">${E().sessions.map(s=>
          `<option value="${s.id}" ${ex.session===s.id?'selected':''}>${s.label} ${s.start}</option>`).join('')}</select>
        ${sittingChip(sub)}
        <span class="tt-warn">${prob||''}</span></div>`;
    }).join('')}
    ${clashNotes()}
    ${examConfirmBox()}
  </div>`;
}

/* Wrong exam dates would quietly wreck the whole plan, so the student has to
   look at them once and say they are right before anything gets built. */
function examConfirmBox(){
  const ok = sub => {
    const e = S.exams[sub];
    if(!e || !e.date) return false;
    return e.portfolio ? true : !E().checkDate(e.date);   // portfolios are not sat, so any date works
  };
  const bad = S.subjects.filter(s => !ok(s));
  if(bad.length) return `<div class="tt-confirm tt-confirm-bad">
    Still to sort: ${bad.map(label).join(', ')}. Every subject needs a date inside the exam period.</div>`;
  if(S.examsConfirmed) return `<div class="tt-confirm tt-confirm-ok">
    <span>Dates confirmed.</span>
    <button id="tt-unconfirm" class="tt-linkbtn">Change them</button></div>`;
  return `<div class="tt-confirm">
    <p class="tt-confirm-q">Check these against your own NZQA timetable before you go on — the whole plan is built backwards from these dates and times.</p>
    <ul class="tt-confirm-list">${S.subjects.map(sub=>{
      const ex = S.exams[sub];
      const sess = E().sessions.find(x => x.id === ex.session) || {};
      return `<li><i class="tt-dot" style="background:${hueFor(sub)}"></i>
        <strong>${label(sub)}</strong> — ${pretty(ex.date,{weekday:'long', day:'numeric', month:'long'})}${
        ex.portfolio ? ' — portfolio submission' : ', ' + (sess.label||'') + ' ' + (sess.start||'')}</li>`;
    }).join('')}</ul>
    <button id="tt-confirm" class="btn-go">These dates and times are right</button>
  </div>`;
}

function stepPeriods(){
  if(!S.subjects.length) return '';
  if(S.plan && !S.open3) return doneBar('WHEN YOU STUDY',
    S.periods.map(p => p.name).join(' · '), '3');
  const r = realism();
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">When can you study?</h3>
    <p class="text-xs soft mb-3">How much you can do changes across the year, so set it per period.
      Term-time is squeezed; holidays and study leave are not. Edit the dates to match your school.</p>
    ${S.periods.map((p,i)=>`<div class="tt-period">
      <div class="tt-pmeta">
        <input class="field tt-pname" data-i="${i}" value="${p.name}">
        <input type="date" class="field tt-pd" data-i="${i}" data-k="start" value="${p.start}">
        <span class="soft text-xs">to</span>
        <input type="date" class="field tt-pd" data-i="${i}" data-k="end" value="${p.end}">
        <span class="tt-phrs">${p.hours.reduce((a,b)=>a+b,0)} h/week</span>
        <button class="tt-prem" data-i="${i}" title="Remove this period">&times;</button>
      </div>
      <div class="tt-hours">${WEEKDAYS.map((w,d)=>`<label class="tt-hour"><span>${w}</span>
        <input type="number" min="0" max="10" class="tt-ph${p.hours[d]?'':' tt-zero'}" data-i="${i}" data-d="${d}" value="${p.hours[d]}"></label>`).join('')}</div>
    </div>`).join('')}
    <button id="tt-addp" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold mt-2">+ Add a period</button>
    <div class="mt-3">
      <span class="text-[10px] font-black uppercase tracking-widest soft">Individual days off</span>
      <div class="tt-offrow">
        <input type="date" id="tt-offdate" class="field" min="${planStart()}">
        <button id="tt-offadd" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Add this day</button>
        <button id="tt-offcal" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">
          ${S.pickerOpen ? 'Close calendar' : 'Pick from a calendar'}</button>
      </div>
      ${S.pickerOpen ? offPicker() : ''}
      <div class="tt-offlist">
        ${S.blackouts.length
          ? S.blackouts.slice().sort().map(d =>
              `<span class="tt-offchip">${pretty(d)}<button class="tt-offx" data-d="${d}" title="Remove">&times;</button></span>`).join('')
          : `<span class="text-xs soft">No days off set. Weekends already follow the hours you set above.</span>`}
      </div>
    </div>
    <p class="text-xs soft mt-2">${r.total} study blocks available before your last exam.</p>
    ${r.notes.map(n=>`<div class="tt-note ${n.tone}">${n.text}</div>`).join('')}
  </div>`;
}

/* A month grid for marking days off. Clicking a day toggles it, so a long
   weekend away is three clicks rather than typing three dates. */
function offPicker(){
  const m = monthStart(S.pickerMonth || planStart());
  const lead = wdIndex(m), mi = monthOf(m);
  const cells = new Array(lead).fill(null);
  let d = m;
  while(monthOf(d) === mi){ cells.push(d); d = addDays(d,1); }
  const end = lastExamDate();
  return `<div class="tt-offcal">
    <div class="tt-offhead">
      <button class="tt-offnav" data-step="-1">&lsaquo;</button>
      <span>${pretty(m,{month:'long', year:'numeric'})}</span>
      <button class="tt-offnav" data-step="1">&rsaquo;</button>
    </div>
    <div class="tt-offgrid">
      ${WEEKDAYS.map(w=>`<div class="tt-offdow">${w[0]}</div>`).join('')}
      ${cells.map(c=>{
        if(!c) return `<span></span>`;
        const off = S.blackouts.includes(c);
        const outside = !periodFor(c) || (end && c > end);
        const exam = isExamDay(c);
        const none = hoursOn(c) === 0 && !off && !exam;
        return `<button class="tt-offday${off?' is-off':''}${outside?' is-out':''}${none?' is-none':''}${exam?' is-exam':''}"
          data-d="${c}" title="${exam ? 'You sit an exam that day'
            : off ? 'A day off — click to undo'
            : outside ? 'Outside your study period'
            : none ? 'Already zero hours that weekday' : 'Click to take this day off'}">${+c.slice(8)}</button>`;
      }).join('')}
    </div>
    <p class="tt-offhint">Click a date to take it off. Grey days already have no study hours.</p>
  </div>`;
}

function stepGo(){
  if(!S.subjects.length) return '';
  const n = chosenStandards().length;
  const dated = S.subjects.every(s => S.exams[s] && S.exams[s].date &&
    (S.exams[s].portfolio || !E().checkDate(S.exams[s].date)));
  const ready = n>0 && dated && S.examsConfirmed;
  return `<div class="panel p-4 md:p-5 flex flex-wrap items-center gap-3">
    <button id="tt-go" class="btn-go"${ready?'':' disabled style="opacity:.5;cursor:not-allowed"'}>
      ${S.plan?'Rebuild my timetable':'Create my study timetable'}</button>
    <label class="tt-toggle"><input type="checkbox" id="tt-topics" ${S.withTopics?'checked':''}>
      <span>Give each block a specific topic</span></label>
    <span class="text-xs soft">${n} standard${n===1?'':'s'} selected${
      ready ? '' : n===0 ? ' — tick at least one standard above'
             : !dated ? ' — needs a valid exam date: ' + S.subjects.filter(x=>!(S.exams[x]&&S.exams[x].date&&(S.exams[x].portfolio||!E().checkDate(S.exams[x].date)))).map(label).join(', ')
             : ' — confirm your exam dates above first'}</span>
    <button id="tt-reset" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold ml-auto">Start again</button>
  </div>`;
}

function wire(){
  const q = (s,fn) => R().querySelectorAll(s).forEach(fn);
  const one = s => R().querySelector(s);

  // Switching level only changes what you are BROWSING — chosen subjects stay,
  // so a Level 3 student can add a Scholarship subject to the same plan.
  q('.tt-reopen', b => b.onclick = () => { S['open'+b.dataset.step] = true; render(); });
  q('.tt-lvl', b => b.onclick = () => { S.level = b.dataset.l; S.faculty = null; render(); });
  q('.tt-fac', b => b.onclick = () => { S.faculty = +b.dataset.i; render(); });
  q('.tt-pick', b => b.onclick = () => {
    const k = key(S.level, b.dataset.n);
    if(S.subjects.includes(k)) S.subjects = S.subjects.filter(x=>x!==k);
    else if(S.subjects.length < MAX_SUBJECTS){
      S.subjects.push(k);
      S.standards[k] = new Set(externalStandards(k).map(x=>x.code));
      const d = E().dateFor(S.level, b.dataset.n);
      S.exams[k] = d ? { date:d.date||'', session:d.session||'AM', portfolio:!!d.portfolio }
                     : { date:'', session:'AM' };
    }
    S.examsConfirmed = false; S.plan = null; render();
  });
  q('.tt-x', b => b.onclick = () => {
    S.subjects = S.subjects.filter(x=>x!==b.dataset.n);
    S.examsConfirmed=false; S.plan=null; render();
  });
  q('.tt-check input', el => el.onchange = () => {
    const s = S.standards[el.dataset.sub];
    el.checked ? s.add(el.dataset.code) : s.delete(el.dataset.code);
    S.plan = null;
  });
  q('.tt-date', el => el.onchange = () => { S.exams[el.dataset.sub].date = el.value; S.examsConfirmed=false; S.plan=null; render(); });
  q('.tt-sess', el => el.onchange = () => { S.exams[el.dataset.sub].session = el.value; S.examsConfirmed=false; S.plan=null; render(); });

  q('.tt-pname', el => el.onchange = () => { S.periods[+el.dataset.i].name = el.value; });
  q('.tt-pd', el => el.onchange = () => { S.periods[+el.dataset.i][el.dataset.k] = el.value; S.plan=null; render(); });
  q('.tt-ph', el => el.onchange = () => {
    S.periods[+el.dataset.i].hours[+el.dataset.d] = Math.max(0, Math.min(10, +el.value||0));
    S.plan=null; render();
  });
  q('.tt-prem', b => b.onclick = () => { S.periods.splice(+b.dataset.i,1); S.plan=null; render(); });
  const addp = one('#tt-addp');
  if(addp) addp.onclick = () => {
    const last = S.periods[S.periods.length-1];
    S.periods.push({ name:'New period',
      start: last ? addDays(last.end,1) : todayISO(),
      end:   last ? addDays(last.end,14) : addDays(todayISO(),14),
      hours:[2,2,2,2,2,2,0] });
    render();
  };
  const addOff = d => {
    if(!d || S.blackouts.includes(d)) return;
    S.blackouts.push(d); S.plan = null; render();
  };
  const oa = one('#tt-offadd');
  if(oa) oa.onclick = () => { const el = one('#tt-offdate'); addOff(el && el.value); };
  const oc = one('#tt-offcal');
  if(oc) oc.onclick = () => {
    S.pickerOpen = !S.pickerOpen;
    S.pickerMonth = S.pickerMonth || planStart();
    render();
  };
  q('.tt-offx', b => b.onclick = () => {
    S.blackouts = S.blackouts.filter(x => x !== b.dataset.d); S.plan = null; render();
  });
  q('.tt-offnav', b => b.onclick = () => {
    S.pickerMonth = addMonths(monthStart(S.pickerMonth || planStart()), +b.dataset.step); render();
  });
  q('.tt-offday', b => b.onclick = () => {
    const d = b.dataset.d;
    if(S.blackouts.includes(d)) S.blackouts = S.blackouts.filter(x => x !== d);
    else S.blackouts.push(d);
    S.plan = null; render();
  });

  const go = one('#tt-go');
  if(go) go.onclick = () => {
    try {
      S.plan = generate();
      if(!S.plan){ alert('Nothing to schedule yet. Check you have ticked some standards and set your study hours.'); return; }
      S.view = 'week'; S.cursor = todayISO(); render();
    } catch(err){
      console.error(err);
      alert('Something went wrong building the timetable. If this keeps happening, use Start again to clear your saved plan.');
    }
  };
  const rg = one('#tt-regen');
  if(rg) rg.onclick = () => {
    const edited = S.plan && S.plan.open.some(x => x.extra);
    const msg = edited
      ? 'Regenerating builds the plan again from scratch. Any blocks you added, moved or cleared by hand will be lost. Carry on?'
      : 'Regenerating builds the plan again from scratch, so any changes you have made by hand will be lost. Carry on?';
    if(confirm(msg)){ S.plan = generate(); save(); render(); }
  };

  q('.tt-view', b => b.onclick = () => { S.view = b.dataset.v; render(); });
  q('.tt-arrow', b => b.onclick = () => {
    const n = +b.dataset.step;
    if(S.view==='day') S.cursor = addDays(S.cursor,n);
    else if(S.view==='week') S.cursor = addDays(S.cursor,7*n);
    else S.cursor = addMonths(S.cursor, n);
    render();
  });
  const td = one('.tt-today'); if(td) td.onclick = () => { S.cursor = todayISO(); render(); };

  q('.tt-copy', b => b.onclick = async () => {
    const text = window.composePrompt({ level:S.level, subject:decodeURIComponent(b.dataset.sub),
      code:b.dataset.code, mode:b.dataset.mode });
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const o = b.textContent; b.textContent='Copied ✓'; setTimeout(()=>b.textContent=o,1500);
  });
  const nw = one('#tt-now');
  if(nw) nw.onclick = () => {
    const b = nextBlock(); if(!b) return;
    S.cursor = b.date; S.view = 'day'; render();
  };
  const sh = one('#tt-share'); if(sh) sh.onclick = () => copyPlanLink(sh);
  const ics = one('#tt-ics'); if(ics) ics.onclick = () => download('ncea-study-plan.ics', toICS(), 'text/calendar');
  const pr  = one('#tt-print');  if(pr)  pr.onclick  = () => printPlan('all');
  const pr1 = one('#tt-print1'); if(pr1) pr1.onclick = () => printPlan('week');

  const tp = one('#tt-topics');
  if(tp) tp.onchange = () => { S.withTopics = tp.checked; S.plan = null; render(); };

  const rs = one('#tt-reset');
  if(rs) rs.onclick = () => {
    if(confirm('Clear your saved timetable and start again?')){ wipe(); render(); }
  };

  const cf = one('#tt-confirm');
  if(cf) cf.onclick = () => { S.examsConfirmed = true; render(); };
  const uc = one('#tt-unconfirm');
  if(uc) uc.onclick = () => { S.examsConfirmed = false; render(); };

  q('.tt-fm', b => b.onclick = () => { S.fullMode = b.dataset.m; render(); });
  q('.tt-hm', b => b.onclick = () => { S.howMode = b.dataset.h; render(); });
  q('.tt-mnum[data-goto]', c => c.onclick = () => { S.cursor = c.dataset.goto; S.view='day'; render(); });
  q('.tt-mslot', b => b.onclick = () => placeInto(+b.dataset.empty));
  q('.tt-addhr', b => b.onclick = () => addHourTo(b.dataset.date));

  // arm a subject, then click a + to place it
  q('.tt-arm', b => b.onclick = () => {
    S.armed = b.classList.contains('tt-armoff') ? null
            : (S.armed === b.dataset.s ? null : b.dataset.s);
    render();
  });
  q('.tt-del', b => b.onclick = () => {
    S.plan.open[+b.dataset.slot].item = null;
    S.plan.used = S.plan.open.filter(x=>x.item).length;
    save(); render();
  });
  q('.tt-slot', b => b.onclick = () => placeInto(+b.dataset.empty));

  q('.tt-gem', b => b.onclick = async () => {
    const k = decodeURIComponent(b.dataset.sub);
    const text = window.composePrompt({ level:kLvl(k), subject:kName(k),
      code:b.dataset.code, mode:b.dataset.mode, topic:decodeURIComponent(b.dataset.topic||'') });
    let ok = true;
    try { await navigator.clipboard.writeText(text); }
    catch(e){ ok = false; }
    if(!ok){ alert('Your browser blocked the copy. Use Open ↗ instead, then copy from there.'); return; }
    const o = b.textContent; b.textContent = 'Copied ✓';
    setTimeout(()=>{ b.textContent = o; window.open('https://gemini.google.com/app','_blank','noopener'); }, 500);
  });
}

})();
