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

const TT_BUILD = 'build 5 — days-off calendar';

const R = () => document.getElementById('tt-root');
const E = () => window.NCEA_EXAMS;
const D = () => window.NCEA_DATA[S.level];

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
      withTopics:S.withTopics, howMode:S.howMode, view:S.view, fullMode:S.fullMode, cursor:S.cursor,
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
      withTopics: o.withTopics !== false, howMode:o.howMode||'ai', view:o.view||'week',
      fullMode:o.fullMode||'subject', cursor:o.cursor||todayISO()
    });
    S.standards = {};
    Object.entries(o.standards||{}).forEach(([k,v]) => S.standards[k] = new Set(v));
    S.savedPlan = o.plan || null;
    return true;
  } catch(e){ return false; }
}
function rehydrate(){
  if(!S.savedPlan || !window.NCEA_DATA || !window.NCEA_DATA[S.level]) return;
  const open = S.savedPlan.map(x => {
    const slot = { date:x.d, index:x.i, item:null, extra: !!x.e };
    if(x.s && D().subjects[x.s]){
      const st = D().subjects[x.s].standards.find(y => y.code === x.c);
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
function hoursOn(date){
  if(S.blackouts.includes(date)) return 0;
  const p = periodFor(date);
  return p ? (p.hours[wdIndex(date)] || 0) : 0;
}
function planStart(){ return S.periods.length ? S.periods.map(p=>p.start).sort()[0] : todayISO(); }
function hueFor(sub){ return HUES[S.subjects.indexOf(sub) % HUES.length]; }

/* ---------- selections ---------- */
function externalSubjects(){
  return Object.entries(D().subjects)
    .filter(([,s]) => s.standards.some(x => x.mode === 'external'))
    .map(([n]) => n).sort();
}
function externalStandards(sub){
  return D().subjects[sub].standards.filter(x => x.mode === 'external')
    .sort((a,b) => a.ref.localeCompare(b.ref, undefined, {numeric:true}));
}
function chosenStandards(){
  const out = [];
  S.subjects.forEach(sub => externalStandards(sub).forEach(st => {
    if(S.standards[sub] && S.standards[sub].has(st.code))
      out.push({ subject: sub, st, exam: S.exams[sub] });
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

  const totalWeight = items.reduce((a,i) => a + i.st.credits, 0);

  // How many blocks each standard earns, weighted by credits, minimum three
  // so every standard gets an orientation, a working and a consolidation pass.
  items.forEach(i => {
    i.blocks = Math.max(3, Math.round(open.length * i.st.credits / totalWeight));
    i.deadline = open.filter(s => slotBeforeExam(s, i.exam)).length;
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
    const eve = addDays(i.exam.date, -1);
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
  const key = (item.st.code.charCodeAt(3) + slotIndex) % pool.length;
  return pool[key];
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
  if(!on.length && !planned) return '';
  return `<p class="tt-cap${extra?' tt-over':''}">${on.length} hour${on.length===1?'':'s'} on this day` +
    (extra ? ` — ${extra} more than you planned for` : planned ? '' : ' — a day you had set aside') + `</p>`;
}

const modeLabel = m => ({ explainer:'Learn it', exam:'Practise it', recall:'Drill it' })[m] || m;
const blocksOn = d => S.plan ? S.plan.open.filter(s => s.date === d && s.item) : [];
const examsOn  = d => S.subjects.filter(s => S.exams[s] && S.exams[s].date === d);

/* ============================================================
   VIEWS — long views show colour only, short views show detail
   ============================================================ */
function viewBar(){
  const views = [['day','Day'],['week','Week'],['month','Month'],['full','Full plan']];
  const label = S.view==='day'   ? pretty(S.cursor,{weekday:'long',day:'numeric',month:'long'})
              : S.view==='week'  ? 'Week of ' + pretty(weekStart(S.cursor))
              : S.view==='month' ? pretty(S.cursor,{month:'long',year:'numeric'})
              : 'Whole plan';
  return `<div class="tt-viewbar">
    <div class="flex gap-1">${views.map(([v,l])=>
      `<button class="tt-view" data-v="${v}" aria-pressed="${S.view===v}">${l}</button>`).join('')}</div>
    ${S.view!=='full' ? `<div class="tt-nav">
      <button class="tt-arrow" data-step="-1">&lsaquo;</button>
      <span class="tt-navlabel">${label}</span>
      <button class="tt-arrow" data-step="1">&rsaquo;</button>
      <button class="tt-today">Today</button></div>`
      : `<span class="tt-navlabel">${label}</span>`}
    <div class="tt-legend">${S.subjects.map(s=>
      `<span class="tt-key"><i style="background:${hueFor(s)}"></i>${s}</span>`).join('')}</div>
  </div>`;
}

function blockHTML(slot, n){
  const it = slot.item;
  const q = `?level=${S.level}&subject=${encodeURIComponent(it.subject)}&std=${it.st.code}&mode=${it.mode}` +
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
    <div class="tt-bmeta"><strong>${it.subject}</strong> · AS${it.st.code}
      <span class="tt-mode">${modeLabel(it.mode)}</span></div>
    <div class="tt-btitle">${it.topic ? it.topic : it.st.title}</div>
    ${actions}</div>`;
}

/* An unused slot is a place the student can drop a subject into. */
function emptyHTML(n){
  return `<button class="tt-slot" data-empty="${n}" title="${S.armed ? 'Place ' + S.armed + ' here' : 'Pick a subject above first'}">+</button>`;
}

function dayView(){
  const d = S.cursor, ex = examsOn(d);
  const b = S.plan ? S.plan.open.map((s,n)=>({s,n})).filter(x => x.s.date === d) : [];
  const eve = S.subjects.filter(s => S.exams[s] && addDays(S.exams[s].date,-1) === d);
  return `<div class="tt-dayview">
    ${ex.length ? `<div class="tt-flagbig">EXAM TODAY — ${ex.map(s=>s+' '+S.exams[s].session).join(', ')}</div>` : ''}
    ${!ex.length && eve.length ? `<div class="tt-flagbig tt-evebig">Night before ${eve.join(' and ')}</div>` : ''}
    ${b.length ? b.map(x => x.s.item ? blockHTML(x.s, x.n) : emptyHTML(x.n)).join('')
      : `<p class="text-sm soft mb-2">Nothing planned for this day.</p>`}
    ${dayCapacity(d)}
    <button class="tt-addhr" data-date="${d}">${S.armed ? '+ Add ' + S.armed + ' here' : '+ Add another hour'}</button>
  </div>`;
}

function weekView(){
  const start = weekStart(S.cursor);
  return `<div class="tt-week">${WEEKDAYS.map((w,i)=>{
    const d = addDays(start,i), ex = examsOn(d);
    const b = S.plan ? S.plan.open.map((s,n)=>({s,n})).filter(x => x.s.date === d) : [];
    const eve = S.subjects.some(s => S.exams[s] && addDays(S.exams[s].date,-1) === d);
    return `<div class="tt-wday${d===todayISO()?' tt-today-col':''}">
      <div class="tt-wdh">${w}<span>${pretty(d,{day:'numeric',month:'short'})}</span></div>
      ${ex.length ? `<div class="tt-flag">EXAM</div>` : eve ? `<div class="tt-flag tt-eve">Eve</div>` : ''}
      ${b.length ? b.map(x => x.s.item ? blockHTML(x.s, x.n) : emptyHTML(x.n)).join('') : `<p class="tt-empty">&mdash;</p>`}
      <button class="tt-addhr tt-addsm" data-date="${d}" title="${S.armed ? 'Add '+S.armed+' to this day' : 'Add another hour to this day'}">+</button>
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
        ? `<span class="tt-mname" style="--hue:${hueFor(o.x.item.subject)}" title="${o.x.item.subject} — AS${o.x.item.st.code}">
             ${o.x.item.subject}<button class="tt-del tt-mdel" data-slot="${o.n}" title="Clear">&times;</button></span>`
        : `<button class="tt-mslot" data-empty="${o.n}" title="${S.armed?'Place '+S.armed+' here':'Pick a subject above first'}">+</button>`
      ).join('');
      return `<div class="tt-mcell${c===todayISO()?' tt-today-cell':''}">
        <span class="tt-mnum" data-goto="${c}" title="Open this day">${+c.slice(8)}</span>
        ${ex.length?`<span class="tt-mexam">EXAM</span>`:''}
        <div class="tt-mnames">${chips}</div>
        <button class="tt-addhr tt-maddhr" data-date="${c}" title="${S.armed ? 'Add '+S.armed : 'Add another hour'}">+</button>
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
    t += `<tr><td class="tt-sub"><i class="tt-dot" style="background:${hueFor(sub)}"></i>${sub}</td>`;
    list.forEach(w=>{
      const n = weeks[w].filter(s => s.item && s.item.subject === sub).length;
      t += `<td class="${n?'tt-has':'tt-none'}"${n?` style="background:color-mix(in srgb,${hueFor(sub)} ${Math.min(55,n*9)}%,transparent)"`:''}>${n?n+'h':'·'}</td>`;
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
      <div class="tt-ph-side">
        <h3 class="sec-h">Your plan</h3><span class="text-xs soft">${p.used} study blocks</span>
      </div>
      <div class="tt-how-switch" role="group" aria-label="How to study each block">
        ${[['ai','With AI'],['mix','Mix'],['offline','Without AI'],['none','None']].map(([k,l])=>
          `<button class="tt-hm" data-h="${k}" aria-pressed="${S.howMode===k}">${l}</button>`).join('')}
      </div>
      <div class="tt-ph-side tt-ph-right">
        <button id="tt-ics" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Add to calendar</button>
        <button id="tt-print" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Print this view</button>
        <button id="tt-regen" class="btn-go px-3 py-1.5 text-[11px]">Regenerate</button>
      </div>
    </div>
    ${viewBar()}
    ${`<div class="tt-armbar">
      <span class="tt-armlabel">${S.armed ? 'Click a + to place ' + S.armed : 'Add a block:'}</span>
      ${S.subjects.map(sub=>`<button class="tt-arm" data-s="${sub}" aria-pressed="${S.armed===sub}"
        style="--hue:${hueFor(sub)}">${sub}</button>`).join('')}
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
      `?level=${S.level}&subject=${encodeURIComponent(it.subject)}&std=${it.st.code}&mode=${it.mode}`;
    out.push('BEGIN:VEVENT', `UID:whs-${s.date}-${n}@ncea`,
      `DTSTART:${at(s.date,h)}`, `DTEND:${at(s.date,h+1)}`,
      `SUMMARY:${it.subject} — AS${it.st.code} (${modeLabel(it.mode)})`,
      `DESCRIPTION:${it.st.title}\\n\\nOpen your prompt: ${url}`, `URL:${url}`, 'END:VEVENT');
  });
  return out.concat('END:VCALENDAR').join('\r\n');
}
/* Print just the plan. Opening a clean window avoids fighting the page's
   own layout and lets the student Save as PDF from the same dialog. */
function printPlan(){
  const node = R().querySelector('.tt-plan');
  if(!node) return;
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const w = window.open('', '_blank', 'width=1100,height=800');
  if(!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>NCEA study plan</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>${css}
      body{ background:#fff; padding:18px; font-family:Manrope,sans-serif; }
      .tt-acts,.tt-del,.tt-slot,.tt-armbar,.tt-viewbar,.tt-fullswitch{ display:none!important; }
      .panel{ box-shadow:none!important; border:0!important; }
      @page{ margin:12mm; }
    </style></head><body>
    <h1 style="font-size:17px;font-weight:800;margin-bottom:2px">NCEA study plan</h1>
    <p style="font-size:11px;color:#555;margin-bottom:12px">${S.subjects.join(' · ')}</p>
    ${node.innerHTML}
    </body></html>`);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); }, 400);
}

function download(name,text,type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

load();
S.cursor = S.cursor || todayISO();

window.Timetable = { open: render, state: S, generate, realism, toICS, reset: wipe };

/* ============================================================
   UI
   ============================================================ */
function render(){
  if(!window.NCEA_DATA || !window.NCEA_DATA[S.level]){
    R().innerHTML = `<div class="panel p-5"><p class="text-sm">Loading Level ${S.level}…</p></div>`;
    const t = document.createElement('script');
    t.src = 'ncea-l' + S.level + '.js?v=5';
    t.onload = render;
    t.onerror = () => R().innerHTML =
      `<div class="panel p-5"><p class="text-sm">Could not load ncea-l${S.level}.js. It needs to sit in the same folder as this page.</p></div>`;
    document.head.appendChild(t);
    return;
  }
  if(S.savedPlan) rehydrate();
  R().innerHTML = stepLevel() + stepSubjects() + stepStandards() + stepExams() +
                  stepPeriods() + stepGo() + (S.plan ? renderPlan() : '') +
                  `<p class="tt-build">${TT_BUILD}</p>`;
  wire();
  save();
}

function stepLevel(){
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-2">NCEA level</h3>
    <div class="flex flex-wrap gap-2">${['1','2','3'].map(l=>
      `<button class="fac-pill lvl-pill tt-lvl" data-l="${l}" aria-pressed="${S.level===l}">Level ${l}</button>`).join('')}</div>
  </div>`;
}

function stepSubjects(){
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
      `<button class="subj-pill tt-pick" data-n="${n}" aria-pressed="${S.subjects.includes(n)}"
        style="--fac-dark:${facs[S.faculty].dark};--fac-light:${facs[S.faculty].light}">${n}</button>`).join('')}</div>` : ''}
    <div class="tt-basket">${S.subjects.length
      ? S.subjects.map(n=>`<span class="tt-chip" style="background:${hueFor(n)}">${n}<button class="tt-x" data-n="${n}">&times;</button></span>`).join('')
        + `<span class="text-xs soft ml-2">${S.subjects.length} of ${MAX_SUBJECTS}</span>`
      : `<span class="text-xs soft">Nothing chosen yet.</span>`}</div>
  </div>`;
}

function stepStandards(){
  if(!S.subjects.length) return '';
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Which standards are you sitting?</h3>
    <p class="text-xs soft mb-3">All ticked to start with. Untick anything you are not doing.</p>
    ${S.subjects.map(sub=>`<div class="tt-stdgroup">
      <p class="tt-stdsub" style="color:${hueFor(sub)}">${sub}</p>
      ${externalStandards(sub).map(st=>`<label class="tt-check">
        <input type="checkbox" data-sub="${sub}" data-code="${st.code}"
          ${S.standards[sub]&&S.standards[sub].has(st.code)?'checked':''}>
        <span><strong>AS${st.code}</strong> · ${st.credits} cr — ${st.title}</span></label>`).join('')}
    </div>`).join('')}
  </div>`;
}

function stepExams(){
  if(!S.subjects.length) return '';
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Exam dates</h3>
    <p class="text-xs soft mb-3">Pre-filled from the ${E().year} timetable. Check yours on
      <a href="${E().timetableUrl}" target="_blank" rel="noopener" class="underline">NZQA</a>.</p>
    ${S.subjects.map(sub=>{
      const ex = S.exams[sub]||{}, prob = ex.date ? E().checkDate(ex.date) : 'No date yet.';
      return `<div class="tt-examrow">
        <span class="tt-examsub"><i class="tt-dot" style="background:${hueFor(sub)}"></i>${sub}</span>
        <input type="date" class="field tt-date" data-sub="${sub}" value="${ex.date||''}"
          min="${E().window.start}" max="${E().window.end}">
        <select class="field tt-sess" data-sub="${sub}">${E().sessions.map(s=>
          `<option value="${s.id}" ${ex.session===s.id?'selected':''}>${s.label} ${s.start}</option>`).join('')}</select>
        <span class="tt-warn">${prob||''}</span></div>`;
    }).join('')}
  </div>`;
}

function stepPeriods(){
  if(!S.subjects.length) return '';
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
        <span class="text-xs soft ml-auto">${p.hours.reduce((a,b)=>a+b,0)} h/week</span>
        <button class="tt-prem" data-i="${i}" title="Remove this period">&times;</button>
      </div>
      <div class="tt-hours">${WEEKDAYS.map((w,d)=>`<label class="tt-hour"><span>${w}</span>
        <input type="number" min="0" max="10" class="field tt-ph" data-i="${i}" data-d="${d}" value="${p.hours[d]}"></label>`).join('')}</div>
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
        const none = hoursOn(c) === 0 && !off;
        return `<button class="tt-offday${off?' is-off':''}${outside?' is-out':''}${none?' is-none':''}"
          data-d="${c}" title="${off ? 'A day off — click to undo'
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
  const ready = n>0 && S.subjects.every(s => S.exams[s] && S.exams[s].date && !E().checkDate(S.exams[s].date));
  return `<div class="panel p-4 md:p-5 flex flex-wrap items-center gap-3">
    <button id="tt-go" class="btn-go"${ready?'':' disabled style="opacity:.5;cursor:not-allowed"'}>
      ${S.plan?'Rebuild my timetable':'Create my study timetable'}</button>
    <label class="tt-toggle"><input type="checkbox" id="tt-topics" ${S.withTopics?'checked':''}>
      <span>Give each block a specific topic</span></label>
    <span class="text-xs soft">${n} standard${n===1?'':'s'} selected${ready?'':' — every subject needs a valid exam date'}</span>
    <button id="tt-reset" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold ml-auto">Start again</button>
  </div>`;
}

function wire(){
  const q = (s,fn) => R().querySelectorAll(s).forEach(fn);
  const one = s => R().querySelector(s);

  q('.tt-lvl', b => b.onclick = () => {
    S.level = b.dataset.l; S.faculty=null; S.subjects=[]; S.standards={}; S.exams={}; S.plan=null; render();
  });
  q('.tt-fac', b => b.onclick = () => { S.faculty = +b.dataset.i; render(); });
  q('.tt-pick', b => b.onclick = () => {
    const n = b.dataset.n;
    if(S.subjects.includes(n)) S.subjects = S.subjects.filter(x=>x!==n);
    else if(S.subjects.length < MAX_SUBJECTS){
      S.subjects.push(n);
      S.standards[n] = new Set(externalStandards(n).map(x=>x.code));
      const d = E().dateFor(S.level, n);
      S.exams[n] = d ? { date:d.date, session:d.session } : { date:'', session:'AM' };
    }
    S.plan = null; render();
  });
  q('.tt-x', b => b.onclick = () => { S.subjects = S.subjects.filter(x=>x!==b.dataset.n); S.plan=null; render(); });
  q('.tt-check input', el => el.onchange = () => {
    const s = S.standards[el.dataset.sub];
    el.checked ? s.add(el.dataset.code) : s.delete(el.dataset.code);
    S.plan = null;
  });
  q('.tt-date', el => el.onchange = () => { S.exams[el.dataset.sub].date = el.value; S.plan=null; render(); });
  q('.tt-sess', el => el.onchange = () => { S.exams[el.dataset.sub].session = el.value; S.plan=null; });

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
  if(go) go.onclick = () => { S.plan = generate(); S.view='week'; S.cursor=todayISO(); render(); };
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
  const ics = one('#tt-ics'); if(ics) ics.onclick = () => download('ncea-study-plan.ics', toICS(), 'text/calendar');
  const pr  = one('#tt-print'); if(pr) pr.onclick = printPlan;

  const tp = one('#tt-topics');
  if(tp) tp.onchange = () => { S.withTopics = tp.checked; S.plan = null; render(); };

  const rs = one('#tt-reset');
  if(rs) rs.onclick = () => {
    if(confirm('Clear your saved timetable and start again?')){ wipe(); render(); }
  };

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
    const text = window.composePrompt({ level:S.level, subject:decodeURIComponent(b.dataset.sub),
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
