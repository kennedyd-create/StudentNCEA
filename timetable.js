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
  cursor: null
};

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
    for(let n = 0; n < i.blocks; n++){
      const pos = Math.round(((n + 0.5) / i.blocks) * room);
      const phase = n / i.blocks;
      wanted.push({
        item: i,
        target: Math.min(pos, i.deadline - 1),
        mode: phase < 0.34 ? 'explainer' : phase < 0.72 ? 'exam' : 'recall'
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
    if(best >= 0) filled[best] = { subject: w.item.subject, st: w.item.st, mode: w.mode };
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

function blockHTML(slot){
  const it = slot.item;
  const url = `?level=${S.level}&subject=${encodeURIComponent(it.subject)}&std=${it.st.code}&mode=${it.mode}`;
  return `<div class="tt-block" style="--hue:${hueFor(it.subject)}">
    <div class="tt-bmeta"><strong>${it.subject}</strong> · AS${it.st.code}
      <span class="tt-mode">${modeLabel(it.mode)}</span></div>
    <div class="tt-btitle">${it.st.title}</div>
    <div class="tt-acts">
      <button class="tt-copy" data-sub="${encodeURIComponent(it.subject)}" data-code="${it.st.code}" data-mode="${it.mode}">Copy prompt</button>
      <a class="tt-open" href="${url}" title="Open in the prompt builder">&#8599;</a>
    </div></div>`;
}

function dayView(){
  const d = S.cursor, ex = examsOn(d), b = blocksOn(d);
  const eve = S.subjects.filter(s => S.exams[s] && addDays(S.exams[s].date,-1) === d);
  return `<div class="tt-dayview">
    ${ex.length ? `<div class="tt-flagbig">EXAM TODAY — ${ex.map(s=>s+' '+S.exams[s].session).join(', ')}</div>` : ''}
    ${!ex.length && eve.length ? `<div class="tt-flagbig tt-evebig">Night before ${eve.join(' and ')}</div>` : ''}
    ${b.length ? b.map(blockHTML).join('')
      : `<p class="text-sm soft">Nothing scheduled. ${hoursOn(d) ? 'Spare capacity — use it or rest.' : 'A day off.'}</p>`}
  </div>`;
}

function weekView(){
  const start = weekStart(S.cursor);
  return `<div class="tt-week">${WEEKDAYS.map((w,i)=>{
    const d = addDays(start,i), ex = examsOn(d), b = blocksOn(d);
    const eve = S.subjects.some(s => S.exams[s] && addDays(S.exams[s].date,-1) === d);
    return `<div class="tt-wday${d===todayISO()?' tt-today-col':''}">
      <div class="tt-wdh">${w}<span>${pretty(d,{day:'numeric',month:'short'})}</span></div>
      ${ex.length ? `<div class="tt-flag">EXAM</div>` : eve ? `<div class="tt-flag tt-eve">Eve</div>` : ''}
      ${b.length ? b.map(blockHTML).join('') : `<p class="tt-empty">&mdash;</p>`}
    </div>`;
  }).join('')}</div>`;
}

function monthView(){
  const first = monthStart(S.cursor), lead = wdIndex(first);
  const m = monthOf(first);
  const cells = new Array(lead).fill(null);
  let d = first;
  while(monthOf(d) === m){ cells.push(d); d = addDays(d,1); }
  return `<div class="tt-month">
    ${WEEKDAYS.map(w=>`<div class="tt-mh">${w}</div>`).join('')}
    ${cells.map(c=>{
      if(!c) return `<div class="tt-mcell tt-mout"></div>`;
      const b = blocksOn(c), ex = examsOn(c), counts = {};
      b.forEach(s => counts[s.item.subject] = (counts[s.item.subject]||0)+1);
      return `<div class="tt-mcell${c===todayISO()?' tt-today-cell':''}" data-goto="${c}" title="Open this day">
        <span class="tt-mnum">${+c.slice(8)}</span>
        ${ex.length?`<span class="tt-mexam">EXAM</span>`:''}
        <div class="tt-mbars">${Object.entries(counts).map(([s,n])=>
          `<i style="background:${hueFor(s)};flex:${n}" title="${s} — ${n}h"></i>`).join('')}</div>
      </div>`;
    }).join('')}</div>
    <p class="text-xs soft mt-2">Colour only at this zoom. Click any day to open it.</p>`;
}

function fullView(){
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
    <p class="text-xs soft mt-2">Hours per week. A pale or empty row means that subject is being neglected — switch to Week view to see why.</p>`;
}

function renderPlan(){
  const p = S.plan; if(!p) return '';
  const body = S.view==='day' ? dayView() : S.view==='week' ? weekView()
             : S.view==='month' ? monthView() : fullView();
  return `<div class="panel p-4 md:p-5">
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <h3 class="sec-h">Your plan</h3><span class="text-xs soft">${p.used} study blocks</span>
      <div class="ml-auto flex gap-2">
        <button id="tt-ics" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Add to calendar</button>
        <button id="tt-print" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Print</button>
        <button id="tt-regen" class="btn-go px-3 py-1.5 text-[11px]">Regenerate</button>
      </div>
    </div>
    ${viewBar()}${body}
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
function download(name,text,type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

window.Timetable = { open: render, state: S, generate, realism, toICS };

/* ============================================================
   UI
   ============================================================ */
function render(){
  if(!window.NCEA_DATA || !window.NCEA_DATA[S.level]){
    R().innerHTML = `<div class="panel p-5"><p class="text-sm">Loading Level ${S.level}…</p></div>`;
    const t = document.createElement('script');
    t.src = 'ncea-l' + S.level + '.js';
    t.onload = render;
    t.onerror = () => R().innerHTML =
      `<div class="panel p-5"><p class="text-sm">Could not load ncea-l${S.level}.js. It needs to sit in the same folder as this page.</p></div>`;
    document.head.appendChild(t);
    return;
  }
  R().innerHTML = stepLevel() + stepSubjects() + stepStandards() + stepExams() +
                  stepPeriods() + stepGo() + (S.plan ? renderPlan() : '');
  wire();
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
    <label class="block mt-3"><span class="text-[10px] font-black uppercase tracking-widest soft">Individual days off</span>
      <input type="text" id="tt-black" class="field w-full mt-1" placeholder="2026-11-21, 2026-11-22" value="${S.blackouts.join(', ')}"></label>
    <p class="text-xs soft mt-2">${r.total} study blocks available before your last exam.</p>
    ${r.notes.map(n=>`<div class="tt-note ${n.tone}">${n.text}</div>`).join('')}
  </div>`;
}

function stepGo(){
  if(!S.subjects.length) return '';
  const n = chosenStandards().length;
  const ready = n>0 && S.subjects.every(s => S.exams[s] && S.exams[s].date && !E().checkDate(S.exams[s].date));
  return `<div class="panel p-4 md:p-5 flex flex-wrap items-center gap-3">
    <button id="tt-go" class="btn-go"${ready?'':' disabled style="opacity:.5;cursor:not-allowed"'}>
      ${S.plan?'Rebuild my timetable':'Create my study timetable'}</button>
    <span class="text-xs soft">${n} standard${n===1?'':'s'} selected${ready?'':' — every subject needs a valid exam date'}</span>
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
  const bl = one('#tt-black');
  if(bl) bl.onchange = () => {
    S.blackouts = bl.value.split(',').map(x=>x.trim()).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x));
    S.plan=null; render();
  };

  const go = one('#tt-go');
  if(go) go.onclick = () => { S.plan = generate(); S.view='week'; S.cursor=todayISO(); render(); };
  const rg = one('#tt-regen'); if(rg) rg.onclick = () => { S.plan = generate(); render(); };

  q('.tt-view', b => b.onclick = () => { S.view = b.dataset.v; render(); });
  q('.tt-arrow', b => b.onclick = () => {
    const n = +b.dataset.step;
    if(S.view==='day') S.cursor = addDays(S.cursor,n);
    else if(S.view==='week') S.cursor = addDays(S.cursor,7*n);
    else S.cursor = addMonths(S.cursor, n);
    render();
  });
  const td = one('.tt-today'); if(td) td.onclick = () => { S.cursor = todayISO(); render(); };
  q('.tt-mcell[data-goto]', c => c.onclick = () => { S.cursor = c.dataset.goto; S.view='day'; render(); });

  q('.tt-copy', b => b.onclick = async () => {
    const text = window.composePrompt({ level:S.level, subject:decodeURIComponent(b.dataset.sub),
      code:b.dataset.code, mode:b.dataset.mode });
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const o = b.textContent; b.textContent='Copied ✓'; setTimeout(()=>b.textContent=o,1500);
  });
  const ics = one('#tt-ics'); if(ics) ics.onclick = () => download('ncea-study-plan.ics', toICS(), 'text/calendar');
  const pr  = one('#tt-print'); if(pr) pr.onclick = () => window.print();
}

})();
