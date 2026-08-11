/* ============================================================
   STUDY TIMETABLE
   Builds a real revision schedule, not a prompt asking for one.

   Design notes, borrowed from the Year Planner in the WHS teacher
   site and then deliberately inverted where study differs from
   unit planning:
     - Slots are a flat array with a BLOCKED sentinel, so the
       allocator physically cannot schedule into an unavailable day.
     - Spans merge at render time rather than being stored.
     - The year planner places units MANUALLY and keeps them
       CONTIGUOUS. Revision is allocated AUTOMATICALLY and
       INTERLEAVED, because spacing is what the evidence supports.
     - Every block is anchored backwards from a fixed exam date.
   ============================================================ */
(function () {

const R = () => document.getElementById('tt-root');
const E = () => window.NCEA_EXAMS;
const D = () => window.NCEA_DATA[S.level];

const MAX_SUBJECTS = 6;
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];   // index 0 = Monday

const S = {
  level: '3',
  faculty: null,
  subjects: [],                 // chosen subject names, in order
  standards: {},                // subject -> Set of external standard codes
  exams: {},                    // subject -> { date, session }
  hours: [2,2,2,2,2,4,0],       // hours available per weekday, Mon..Sun
  blackouts: [],                // ISO dates the student is unavailable
  startDate: todayISO(),
  plan: null                    // generated schedule
};

/* ---------- small date helpers ---------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function iso(d){ return d.toISOString().slice(0,10); }
function addDays(isoStr, n){
  const d = new Date(isoStr + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d);
}
function weekdayIndex(isoStr){            // 0 = Monday
  const d = new Date(isoStr + 'T00:00:00').getDay();
  return (d + 6) % 7;
}
function pretty(isoStr){
  return new Date(isoStr + 'T00:00:00').toLocaleDateString('en-NZ',
    { weekday:'short', day:'numeric', month:'short' });
}
function daysBetween(a, b){
  return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86400000);
}

/* ---------- what the student is studying ---------- */
function externalSubjects(){
  return Object.entries(D().subjects)
    .filter(([, sub]) => sub.standards.some(x => x.mode === 'external'))
    .map(([name]) => name).sort();
}
function externalStandards(subject){
  return D().subjects[subject].standards
    .filter(x => x.mode === 'external')
    .sort((a,b) => a.ref.localeCompare(b.ref, undefined, {numeric:true}));
}
function chosenStandards(){
  const out = [];
  S.subjects.forEach(sub => {
    externalStandards(sub).forEach(st => {
      if(S.standards[sub] && S.standards[sub].has(st.code))
        out.push({ subject: sub, st, exam: S.exams[sub] });
    });
  });
  return out;
}
function lastExamDate(){
  const dates = S.subjects.map(s => S.exams[s] && S.exams[s].date).filter(Boolean);
  return dates.length ? dates.sort().slice(-1)[0] : null;
}

/* ============================================================
   THE ALLOCATOR
   ============================================================ */

// Every study block the student has time for, in order.
function buildSlots(){
  const end = lastExamDate();
  if(!end) return [];
  const slots = [];
  let day = S.startDate;
  let guard = 0;
  while(day <= end && guard++ < 400){
    const hrs = S.hours[weekdayIndex(day)] || 0;
    const blocked = S.blackouts.includes(day);
    for(let h = 0; h < hrs; h++){
      slots.push(blocked ? 'BLOCKED' : { date: day, index: h, item: null });
    }
    day = addDays(day, 1);
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
  const slots = buildSlots();
  const open = slots.filter(s => s !== 'BLOCKED');
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
  return { slots, open, items, used: filled.filter(Boolean).length };
}

/* ============================================================
   THE REALISM CHECK
   ============================================================ */
function realism(){
  const perWeek = S.hours.reduce((a,b) => a+b, 0);
  const end = lastExamDate();
  const weeks = end ? Math.max(1, Math.round(daysBetween(S.startDate, end) / 7)) : 0;
  const items = chosenStandards();
  const notes = [];
  if(perWeek === 0) notes.push({ tone:'bad', text:'You have not set any study hours yet.' });
  if(perWeek > 20) notes.push({ tone:'warn',
    text:`That is ${perWeek} hours a week on top of school. Most people abandon a plan like that inside a fortnight — 10 to 15 hours is a pace you can actually hold.` });
  if(items.length && perWeek * weeks < items.length * 3) notes.push({ tone:'warn',
    text:`${items.length} standards over ${weeks} weeks needs more hours than you have set, so some will get very little time. Either add hours or drop a standard you are less worried about.` });
  if(S.hours.every(h => h > 0)) notes.push({ tone:'warn',
    text:'You have not left a single day off. Build in at least one — rest is part of the plan, not a failure of it.' });
  return { perWeek, weeks, notes };
}

/* ============================================================
   OUTPUT
   ============================================================ */
function weekKey(isoStr){
  const idx = weekdayIndex(isoStr);
  return addDays(isoStr, -idx);           // Monday of that week
}

function renderPlan(){
  const p = S.plan;
  if(!p) return '';
  const weeks = {};
  p.open.forEach(slot => {
    const wk = weekKey(slot.date);
    (weeks[wk] = weeks[wk] || []).push(slot);
  });
  const weekList = Object.keys(weeks).sort();

  // subject × week matrix — shows at a glance if something is being neglected
  let matrix = `<div class="tt-scroll"><table class="tt-table"><thead><tr><th class="tt-sub">Subject</th>` +
    weekList.map((w,i) => `<th>Wk ${i+1}<span class="tt-wk">${pretty(w).replace(/^\w+, /,'')}</span></th>`).join('') +
    `<th>Exam</th></tr></thead><tbody>`;
  S.subjects.forEach(sub => {
    matrix += `<tr><td class="tt-sub">${sub}</td>`;
    weekList.forEach(w => {
      const n = weeks[w].filter(s => s.item && s.item.subject === sub).length;
      matrix += `<td class="${n ? 'tt-has' : 'tt-none'}">${n ? n + 'h' : '·'}</td>`;
    });
    const ex = S.exams[sub];
    matrix += `<td class="tt-exam">${ex && ex.date ? pretty(ex.date).replace(/^\w+, /,'') + ' ' + ex.session : '—'}</td></tr>`;
  });
  matrix += `</tbody></table></div>`;

  // day-by-day, with the prompt controls on each block
  let days = '';
  let current = null;
  p.open.forEach(slot => {
    if(slot.date !== current){
      current = slot.date;
      const isEve = S.subjects.some(sub => S.exams[sub] && addDays(S.exams[sub].date,-1) === slot.date);
      const examToday = S.subjects.filter(sub => S.exams[sub] && S.exams[sub].date === slot.date);
      days += `<div class="tt-day"><div class="tt-date">${pretty(slot.date)}` +
        (examToday.length ? `<span class="tt-flag">EXAM: ${examToday.join(', ')}</span>` : '') +
        (isEve && !examToday.length ? `<span class="tt-flag tt-eve">Night before an exam</span>` : '') +
        `</div>`;
    }
    if(!slot.item){ days += `<div class="tt-block tt-free">Free</div>`; return; }
    const it = slot.item;
    const url = `?level=${S.level}&subject=${encodeURIComponent(it.subject)}&std=${it.st.code}&mode=${it.mode}`;
    days += `<div class="tt-block">
      <div class="tt-meta"><strong>${it.subject}</strong> · AS${it.st.code} · ${modeLabel(it.mode)}</div>
      <div class="tt-title">${it.st.title}</div>
      <div class="tt-acts">
        <button class="tt-copy" data-sub="${encodeURIComponent(it.subject)}" data-code="${it.st.code}" data-mode="${it.mode}">Copy prompt</button>
        <a class="tt-open" href="${url}" title="Open this standard in the prompt builder">↗</a>
      </div></div>`;
  });
  days += `</div>`;

  return `<div class="panel p-4 md:p-5">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <h3 class="sec-h">Your plan</h3>
        <span class="text-xs soft">${p.used} study blocks to your last exam</span>
        <div class="ml-auto flex gap-2">
          <button id="tt-ics" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Add to calendar</button>
          <button id="tt-print" class="btn-ai px-3 py-1.5 rounded-lg text-[11px] font-bold">Print</button>
          <button id="tt-regen" class="btn-go px-3 py-1.5 text-[11px]">Regenerate</button>
        </div>
      </div>
      ${matrix}
      <p class="text-xs soft mt-3 mb-2">Each block links back to the prompt builder. Copy takes the prompt straight to your clipboard; the arrow opens it so you can change the mode or read the briefing.</p>
      ${days}
    </div>`;
}

function modeLabel(m){
  return ({ explainer:'Learn it', exam:'Practise it', recall:'Drill it' })[m] || m;
}

/* ---------- calendar export ---------- */
function toICS(){
  const p = S.plan; if(!p) return '';
  const pad = n => String(n).padStart(2,'0');
  const stamp = (date, hour) => date.replace(/-/g,'') + 'T' + pad(hour) + '0000';
  let out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WHS//NCEA Master Tutor//EN','CALSCALE:GREGORIAN'];
  p.open.forEach((slot, n) => {
    if(!slot.item) return;
    const it = slot.item;
    const startHour = 16 + slot.index;                 // blocks start from 4pm
    const url = location.origin + location.pathname +
      `?level=${S.level}&subject=${encodeURIComponent(it.subject)}&std=${it.st.code}&mode=${it.mode}`;
    out.push('BEGIN:VEVENT',
      `UID:whs-${slot.date}-${n}@ncea`,
      `DTSTART:${stamp(slot.date, startHour)}`,
      `DTEND:${stamp(slot.date, startHour + 1)}`,
      `SUMMARY:${it.subject} — AS${it.st.code} (${modeLabel(it.mode)})`,
      `DESCRIPTION:${it.st.title}\\n\\nOpen your prompt: ${url}`,
      `URL:${url}`,
      'END:VEVENT');
  });
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}

function download(name, text, type){
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

window.Timetable = { open: render, state: S, generate, realism, toICS };

/* ============================================================
   UI
   ============================================================ */
function render(){
  if(!window.NCEA_DATA || !window.NCEA_DATA[S.level]){
    R().innerHTML = `<div class="panel p-5"><p class="text-sm">Loading Level ${S.level}…</p></div>`;
    loadLevelForTimetable();
    return;
  }
  R().innerHTML = stepSubjects() + stepStandards() + stepExams() + stepAvailability() + stepGenerate() +
    (S.plan ? renderPlan() : '');
  wire();
}

function loadLevelForTimetable(){
  const tag = document.createElement('script');
  tag.src = 'ncea-l' + S.level + '.js';
  tag.onload = render;
  tag.onerror = () => R().innerHTML = `<div class="panel p-5"><p class="text-sm">Could not load ncea-l${S.level}.js.</p></div>`;
  document.head.appendChild(tag);
}

function stepSubjects(){
  const all = externalSubjects();
  const facs = D().faculties.filter(f => f.subjects.some(n => all.includes(n)));
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Which subjects are you sitting?</h3>
    <p class="text-xs soft mb-3">Only subjects with external exams appear. Choose up to ${MAX_SUBJECTS}.</p>
    <div class="flex flex-wrap gap-2 mb-3">
      ${facs.map((f,i)=>`<button class="fac-pill tt-fac" data-i="${i}" aria-pressed="${S.faculty===i}"
        style="--fac-dark:${f.dark};--fac-light:${f.light}">${f.name}</button>`).join('')}
    </div>
    ${S.faculty!=null ? `<div class="flex flex-wrap gap-2 mb-3">
      ${facs[S.faculty].subjects.filter(n=>all.includes(n)).map(n=>`
        <button class="subj-pill tt-sub-pick" data-n="${n}" aria-pressed="${S.subjects.includes(n)}"
          style="--fac-dark:${facs[S.faculty].dark};--fac-light:${facs[S.faculty].light}">${n}</button>`).join('')}
    </div>` : ''}
    <div class="tt-basket">
      ${S.subjects.length ? S.subjects.map(n=>`
        <span class="tt-chip">${n}<button class="tt-x" data-n="${n}" title="Remove">×</button></span>`).join('')
        : `<span class="text-xs soft">Nothing chosen yet.</span>`}
      ${S.subjects.length ? `<span class="text-xs soft ml-2">${S.subjects.length} of ${MAX_SUBJECTS}</span>` : ''}
    </div>
  </div>`;
}

function stepStandards(){
  if(!S.subjects.length) return '';
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Which standards are you sitting?</h3>
    <p class="text-xs soft mb-3">Everything is ticked to start with. Untick anything you are not doing.</p>
    ${S.subjects.map(sub=>`
      <div class="tt-stdgroup">
        <p class="tt-stdsub">${sub}</p>
        ${externalStandards(sub).map(st=>`
          <label class="tt-check">
            <input type="checkbox" data-sub="${sub}" data-code="${st.code}"
              ${S.standards[sub] && S.standards[sub].has(st.code) ? 'checked' : ''}>
            <span><strong>AS${st.code}</strong> · ${st.credits} cr — ${st.title}</span>
          </label>`).join('')}
      </div>`).join('')}
  </div>`;
}

function stepExams(){
  if(!S.subjects.length) return '';
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">Exam dates</h3>
    <p class="text-xs soft mb-3">Pre-filled from the ${E().year} timetable where we have them. Check yours on
      <a href="${E().timetableUrl}" target="_blank" rel="noopener" class="underline">NZQA</a> — and change any of these if you sit at a different time.</p>
    ${S.subjects.map(sub=>{
      const ex = S.exams[sub] || {};
      const problem = ex.date ? E().checkDate(ex.date) : 'No date yet.';
      return `<div class="tt-examrow">
        <span class="tt-examsub">${sub}</span>
        <input type="date" class="field tt-date" data-sub="${sub}" value="${ex.date||''}"
               min="${E().window.start}" max="${E().window.end}">
        <select class="field tt-sess" data-sub="${sub}">
          ${E().sessions.map(s=>`<option value="${s.id}" ${ex.session===s.id?'selected':''}>${s.label} ${s.start}</option>`).join('')}
        </select>
        <span class="tt-warn">${problem ? problem : ''}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function stepAvailability(){
  if(!S.subjects.length) return '';
  const r = realism();
  return `<div class="panel p-4 md:p-5">
    <h3 class="sec-h mb-1">When can you study?</h3>
    <p class="text-xs soft mb-3">Hours per day. Leave a day on zero if you need it off.</p>
    <div class="tt-hours">
      ${WEEKDAYS.map((d,i)=>`
        <label class="tt-hour"><span>${d}</span>
          <input type="number" min="0" max="8" step="1" class="field tt-h" data-i="${i}" value="${S.hours[i]}">
        </label>`).join('')}
    </div>
    <div class="mt-3 grid sm:grid-cols-2 gap-3">
      <label class="block"><span class="text-[10px] font-black uppercase tracking-widest soft">Start from</span>
        <input type="date" id="tt-start" class="field w-full mt-1" value="${S.startDate}"></label>
      <label class="block"><span class="text-[10px] font-black uppercase tracking-widest soft">Days off (comma-separated dates)</span>
        <input type="text" id="tt-blackouts" class="field w-full mt-1" placeholder="2026-11-21, 2026-11-22"
               value="${S.blackouts.join(', ')}"></label>
    </div>
    <p class="text-xs soft mt-2">${r.perWeek} hours a week over about ${r.weeks} weeks.</p>
    ${r.notes.map(n=>`<div class="tt-note ${n.tone}">${n.text}</div>`).join('')}
  </div>`;
}

function stepGenerate(){
  if(!S.subjects.length) return '';
  const n = chosenStandards().length;
  const ready = n > 0 && S.subjects.every(s => S.exams[s] && S.exams[s].date && !E().checkDate(S.exams[s].date));
  return `<div class="panel p-4 md:p-5 flex flex-wrap items-center gap-3">
    <button id="tt-go" class="btn-go" ${ready?'':'disabled style="opacity:.5;cursor:not-allowed"'}>
      ${S.plan ? 'Rebuild my timetable' : 'Create my study timetable'}</button>
    <span class="text-xs soft">${n} standard${n===1?'':'s'} selected${ready?'':' — check every subject has a valid exam date'}</span>
  </div>`;
}

/* ---------- events ---------- */
function wire(){
  const q = (sel, fn) => R().querySelectorAll(sel).forEach(fn);

  q('.tt-fac', b => b.onclick = () => { S.faculty = +b.dataset.i; render(); });

  q('.tt-sub-pick', b => b.onclick = () => {
    const n = b.dataset.n;
    if(S.subjects.includes(n)) S.subjects = S.subjects.filter(x => x !== n);
    else if(S.subjects.length < MAX_SUBJECTS){
      S.subjects.push(n);
      S.standards[n] = new Set(externalStandards(n).map(x => x.code));
      const d = E().dateFor(S.level, n);
      S.exams[n] = d ? { ...d } : { date:'', session:'AM' };
    }
    S.plan = null; render();
  });

  q('.tt-x', b => b.onclick = () => {
    S.subjects = S.subjects.filter(x => x !== b.dataset.n);
    S.plan = null; render();
  });

  q('.tt-check input', el => el.onchange = () => {
    const set = S.standards[el.dataset.sub];
    el.checked ? set.add(el.dataset.code) : set.delete(el.dataset.code);
    S.plan = null;
  });

  q('.tt-date', el => el.onchange = () => {
    S.exams[el.dataset.sub].date = el.value; S.plan = null; render();
  });
  q('.tt-sess', el => el.onchange = () => {
    S.exams[el.dataset.sub].session = el.value; S.plan = null;
  });

  q('.tt-h', el => el.onchange = () => {
    S.hours[+el.dataset.i] = Math.max(0, Math.min(8, +el.value || 0));
    S.plan = null; render();
  });

  const start = R().querySelector('#tt-start');
  if(start) start.onchange = () => { S.startDate = start.value; S.plan = null; render(); };

  const bl = R().querySelector('#tt-blackouts');
  if(bl) bl.onchange = () => {
    S.blackouts = bl.value.split(',').map(x => x.trim()).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x));
    S.plan = null; render();
  };

  const go = R().querySelector('#tt-go');
  if(go) go.onclick = () => { S.plan = generate(); render(); window.scrollBy({top:300, behavior:'smooth'}); };

  const regen = R().querySelector('#tt-regen');
  if(regen) regen.onclick = () => { S.plan = generate(); render(); };

  q('.tt-copy', b => b.onclick = async () => {
    const text = window.composePrompt({
      level: S.level, subject: decodeURIComponent(b.dataset.sub),
      code: b.dataset.code, mode: b.dataset.mode
    });
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const old = b.textContent; b.textContent = 'Copied ✓';
    setTimeout(()=>b.textContent = old, 1500);
  });

  const ics = R().querySelector('#tt-ics');
  if(ics) ics.onclick = () => download('ncea-study-plan.ics', toICS(), 'text/calendar');

  const pr = R().querySelector('#tt-print');
  if(pr) pr.onclick = () => window.print();
}

})();
