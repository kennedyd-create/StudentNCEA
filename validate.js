#!/usr/bin/env node
/* ============================================================
   WHS NCEA MASTER TUTOR — VALIDATOR

   Run it locally:      node validate.js
   It also runs automatically on every push (.github/workflows).

   Every check here exists because something actually went wrong
   once. A file that PARSES can still be broken — a deleted CSS
   block, a renamed class that orphaned a click handler, a
   standard missing its criteria. Those ship silently and are
   found by a student, which is the worst way to find them.

   Exits 0 if everything passes, 1 if anything fails.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ENGINE = 'index.html';                 // falls back to whs-ncea-engine.html
const DATA   = ['ncea-l1.js', 'ncea-l2.js', 'ncea-l3.js', 'ncea-scholarship.js'];
const EXAMS  = 'ncea-exams-2026.js';
const DERIVED = 'whs-derived-2026.js';   // the school's own mock timetable
const TT     = 'timetable.js';
const BIB    = 'bib.js';                 // the APA reference list builder

const REQUIRED_FIELDS = ['bigIdea','format','evidence','criteria','bandShift',
                         'verbs','topics','contexts','misconceptions','pitfalls'];

let failures = 0, warnings = 0;
const fail = m => { console.log('  \x1b[31mFAIL\x1b[0m  ' + m); failures++; };
const warn = m => { console.log('  \x1b[33mWARN\x1b[0m  ' + m); warnings++; };
const pass = m => console.log('  \x1b[32m ok \x1b[0m  ' + m);
const head = m => console.log('\n' + m);

function read(f){ return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }

/* ---------- 1. every file is present and parses ---------- */
head('FILES AND SYNTAX');

const enginePath = fs.existsSync(ENGINE) ? ENGINE : 'whs-ncea-engine.html';
const engine = read(enginePath);
if(!engine){ fail(`${ENGINE} (or whs-ncea-engine.html) is missing`); report(); }
else pass(`${enginePath} present`);

for(const f of [...DATA, EXAMS, DERIVED, TT, BIB]){
  if(!fs.existsSync(f)){ fail(`${f} is missing`); continue; }
  try { new Function(read(f)); pass(`${f} parses`); }
  catch(e){ fail(`${f} has a syntax error: ${e.message}`); }
}

// the engine's inline scripts have to parse too
const inline = [...engine.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
try { new Function(inline.join('\n;\n')); pass('engine inline scripts parse'); }
catch(e){ fail('engine inline script error: ' + e.message); }

/* ---------- 2. load the data ---------- */
global.window = {};
try {
  [EXAMS, DERIVED, ...DATA].forEach(f => { if(fs.existsSync(f)) new Function(read(f))(); });
} catch(e){ fail('could not load the data files: ' + e.message); report(); }

const DATASETS = global.window.NCEA_DATA || {};
const E = global.window.NCEA_EXAMS;

/* ---------- 3. every standard is complete and coherent ---------- */
head('STANDARDS');

let total = 0;
for(const [lvl, d] of Object.entries(DATASETS)){
  for(const [sub, s] of Object.entries(d.subjects)){
    const seen = new Set();
    for(const st of s.standards){
      total++;
      const where = `L${lvl} ${sub} ${st.code}`;

      const missing = REQUIRED_FIELDS.filter(f => {
        const v = st[f];
        if(v == null) return true;
        if(Array.isArray(v)) return v.length === 0;
        if(typeof v === 'object') return Object.keys(v).length === 0;
        return String(v).trim() === '';
      });
      if(missing.length) fail(`${where} is missing: ${missing.join(', ')}`);

      if(seen.has(st.code)) fail(`${where} duplicate standard code`);
      seen.add(st.code);

      if(!['internal','external'].includes(st.mode))
        fail(`${where} has an invalid mode: ${st.mode}`);

      // credits: 0 only for Scholarship performance standards
      if(lvl === 'S'){ if(st.credits !== 0) fail(`${where} Scholarship standard with ${st.credits} credits`); }
      else if(!(st.credits >= 1 && st.credits <= 10)) fail(`${where} implausible credits: ${st.credits}`);

      // the format text must not contradict the mode
      const f = st.format || '';
      if(st.mode === 'internal' && /end-of-year examination|examination paper/i.test(f)
         && !/internally assessed|conditions of assessment/i.test(f))
        fail(`${where} is internal but the format describes an examination`);
      if(st.mode === 'external' && /internally assessed/i.test(f))
        fail(`${where} is external but the format describes internal assessment`);

      // credits stated in prose must match the field
      const m = f.match(/(\d+)\s*credits?/i);
      if(m && +m[1] !== st.credits)
        fail(`${where} format says ${m[1]} credits, field says ${st.credits}`);

      // flags that only make sense on externals
      if(st.reference && st.mode === 'internal')
        fail(`${where} has reference:true on an internal`);
      if(st.ownContext && st.mode === 'internal')
        fail(`${where} has ownContext:true on an internal`);
    }
  }
}
if(!failures) pass(`${total} standards, all complete and coherent`);

/* ---------- 4. exam dates ---------- */
head('EXAM DATES');

if(!E) fail('NCEA_EXAMS did not load');
else {
  let dated = 0, missing = [];
  for(const [lvl, d] of Object.entries(DATASETS)){
    for(const [sub, s] of Object.entries(d.subjects)){
      const hasExternal = s.standards.some(x => x.mode === 'external');
      if(!hasExternal) continue;
      const info = E.dateFor(lvl, sub);
      if(!info){ missing.push(`L${lvl} ${sub}`); continue; }
      dated++;
      if(info.portfolio) continue;                    // no fixed date by design
      const problem = E.checkDate(info.date);
      if(problem) fail(`L${lvl} ${sub} exam date ${info.date}: ${problem}`);
      if(!['AM','PM'].includes(info.session))
        fail(`L${lvl} ${sub} invalid session: ${info.session}`);
      if(info.sitting && !['digital','paper','performance'].includes(info.sitting))
        fail(`L${lvl} ${sub} invalid sitting mode: ${info.sitting}`);
    }
  }
  // a dated subject must actually exist in the data
  for(const lvl of Object.keys(DATASETS)){
    const table = lvl === 'S' ? E.scholarshipDates : (E.subjectDates || {})[lvl];
    for(const name of Object.keys(table || {}))
      if(!DATASETS[lvl].subjects[name])
        fail(`L${lvl} has an exam date for "${name}", which is not in the data`);
  }
  if(missing.length) warn(`no exam date recorded: ${missing.join(', ')}`);
  if(!failures) pass(`${dated} subjects dated, all valid`);
}

/* ---------- 4b. the school's derived grade timetable ---------- */
head('DERIVED GRADE EXAMS');

const DGX = global.window.WHS_DERIVED;
if(!DGX) warn('whs-derived-2026.js did not load — the mock timetable will be unavailable');
else {
  let count = 0;
  for(const [lvl, table] of Object.entries(DGX.subjectDates)){
    for(const [sub, info] of Object.entries(table)){
      count++;
      const where = `L${lvl} ${sub}`;
      if(!DATASETS[lvl] || !DATASETS[lvl].subjects[sub])
        fail(`${where} has a derived grade exam but is not in the subject data`);
      const problem = DGX.checkDate(info.date);
      if(problem) fail(`${where} derived grade date ${info.date}: ${problem}`);
      if(!DGX.sessions.some(x => x.id === info.session))
        fail(`${where} invalid derived grade session: ${info.session}`);
      // A written derived grade paper must have something written behind it.
      // Practical sessions belong in workshops{}, not here.
      const subj = DATASETS[lvl] && DATASETS[lvl].subjects[sub];
      if(subj && !subj.standards.some(x => x.mode === 'external'))
        fail(`${where} is listed as a written exam but has no external standard — should it be a workshop?`);
    }
  }
  // workshops: a name, a day and a session is all they need
  let shops = 0;
  for(const [lvl, table] of Object.entries(DGX.workshops || {})){
    for(const [sub, info] of Object.entries(table)){
      shops++;
      const where = `L${lvl} ${sub} (workshop)`;
      const problem = DGX.checkDate(info.date);
      if(problem) fail(`${where} date ${info.date}: ${problem}`);
      if(!DGX.sessions.some(x => x.id === info.session))
        fail(`${where} invalid session: ${info.session}`);
      if(DGX.dateFor(lvl, sub))
        fail(`${where} is listed as both a written exam and a workshop`);
    }
  }
  pass(`${count} written exams and ${shops} workshops, all valid`);
}

/* ---------- 5. every class used has a style ---------- */
head('STYLES');

const ttSrc  = read(TT)  || '';
const bibSrc = read(BIB) || '';
const classesUsed = new Set();
for(const src of [ttSrc, bibSrc, ...inline]){
  for(const m of src.matchAll(/class="([^"]*)"/g)){
    for(const tok of m[1].split(/[\s${}?:'"()+]+/)){
      // a class ending in '-' is a built prefix like tt-sit-${v}; skip it
      if(/^(tt-|bib-|mgroup|mode-|btn-|seg$|crumb|sit-|pl-|whs-contour|brief)/.test(tok) && tok.length > 2)
        classesUsed.add(tok);
    }
  }
}
/* The pl-* classes belong to the printed plan, which builds its own <style>
   inside a new window rather than using the engine's stylesheet — so check
   them against timetable.js instead. */
const printCss = (ttSrc.match(/<style>[\s\S]*?<\/style>/) || [''])[0];

// hooks that are deliberately JS-only, with no styling of their own
const JS_ONLY = new Set(['tt-dayview','tt-fac','tt-lvl','tt-pick','tt-open','tt-gem',
                         'tt-copy','tt-armoff','tt-today','tt-reopen','tt-ctxsave',
                         'tt-ctxcancel','tt-ctxin','tt-preset','tt-prem','tt-offx',
                         'tt-ctxadd','tt-del','tt-mdel','tt-plan','tt-fresh','tt-extra',
                         'tt-offline','tt-mine','tt-sit','tt-mslot','tt-addsm',
                         'tt-ph','tt-zero','tt-ctxfield','tt-stdctx',
                         /* a selector hook for the grouped mode tiles; its children carry
                            the styling and it needs none of its own */
                         'mgroup']);
const unstyled = [...classesUsed].filter(c => {
  if(JS_ONLY.has(c)) return false;
  if(c.endsWith('-')) return false;                 // a built prefix like tt-sit-${v}
  const rule = new RegExp('\\.' + c + '[\\s,{:.\\[]');
  const where = c.startsWith('pl-') ? printCss : engine;   // print styles live in the print window
  return !rule.test(where);
});
if(unstyled.length) fail(`classes used but never styled: ${unstyled.join(', ')}`);
else pass(`${classesUsed.size} classes checked, all styled`);

/* ---------- 5b. nothing depends on Tailwind arriving ---------- */
head('HIDING WITHOUT TAILWIND');

{
  /* A site rule that sets `display` ties with Tailwind's .hidden on
     specificity, so without a two-class rule of our own the element only
     stays hidden while the CDN loads and loads in the right order. */
  const css = (engine.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const withDisplay = new Set();
  for(const m of css.matchAll(/([^{}]+)\{([^}]*display\s*:\s*([a-z-]+)[^}]*)\}/g)){
    if(m[3] === 'none') continue;
    for(const sel of m[1].split(',')){
      const s = sel.trim();
      const cls = [...s.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(x => x[1]);
      if(cls.length === 1 && !/[\s>+~:]/.test(s.slice(1))) withDisplay.add(cls[0]);
    }
  }
  const exposed = [];
  for(const cls of withDisplay){
    const used = [...engine.matchAll(new RegExp(`class="([^"]*\\b${cls}\\b[^"]*)"`, 'g'))];
    if(!used.some(m => /\bhidden\b/.test(m[1]))) continue;      // never hidden, no clash
    const guard = new RegExp(`\\.${cls}\\.hidden|\\.hidden\\.${cls}`);
    if(!guard.test(css)) exposed.push(cls);
  }
  if(exposed.length)
    fail(`${exposed.map(c => '.' + c).join(', ')} set a display and are hidden with ` +
         'the "hidden" class, but have no .x.hidden rule — they only stay hidden ' +
         'while the Tailwind CDN loads first');
  else pass('every element hidden with "hidden" stays hidden without the CDN');
}

/* ---------- 5c. the links that leave the site are off, not deleted ---------- */
head('EXTERNAL LINKS');

{
  const FLAGS = [
    ['SHOW_SUBJECT_TOOLS',  /const SHOW_SUBJECT_TOOLS\s*=\s*(true|false);/,
     'the Waiheke-made interactive sites'],
    ['SHOW_HIGH_STANDARDS', /const SHOW_HIGH_STANDARDS\s*=\s*(true|false);/,
     'the High Standards NZ notes site'],
    ['SHOW_OFFLINE_CARD',    /const SHOW_OFFLINE_CARD\s*=\s*(true|false);/,
     'the no-screen card at the foot of the mode list']
  ];
  let broke = 0;
  const on = [];
  for(const [name, re, what] of FLAGS){
    const m = engine.match(re);
    if(!m){ fail(`${name} is gone — ${what} can no longer be switched back on`); broke++; continue; }
    if(m[1] === 'true') on.push(name);
  }

  /* switching one off must not mean quietly deleting what it switched */
  const KEPT = [
    [/const SUBJECT_TOOLS = \{[\s\S]*?ChemDash/, 'the subject tool definitions'],
    [/function renderModeTools\(/,                'renderModeTools'],
    [/function hsLink\(/,                         'hsLink'],
    [/highstandards\.co\.nz/,                     'the High Standards URL'],
    [/id="credit-hsnz"/,                          'the High Standards credit'],
    [/id="credit-tools"/,                         'the subject-tools credit'],
    [/\.ext-site\{/,                              'the external-card styling'],
    [/id="offline-card"/,                         'the no-screen card'],
    [/\.off-card/,                                'the no-screen card styling']
  ];
  for(const [re, what] of KEPT)
    if(!re.test(engine)){ fail(`${what} has been deleted, so the flag cannot restore it`); broke++; }

  /* a credit for a link nobody can see is simply a wrong statement */
  const CREDITS = [
    [/credit-hsnz'\)\.classList\.toggle\('hidden', !SHOW_HIGH_STANDARDS\)/, 'credit-hsnz', 'SHOW_HIGH_STANDARDS'],
    [/credit-tools'\)\.classList\.toggle\('hidden', !SHOW_SUBJECT_TOOLS\)/, 'credit-tools', 'SHOW_SUBJECT_TOOLS'],
    [/offline-card'\)\.classList\.toggle\('hidden', !SHOW_OFFLINE_CARD\)/, 'offline-card', 'SHOW_OFFLINE_CARD']
  ];
  for(const [re, id, flag] of CREDITS)
    if(!re.test(engine)){ fail(`the ${id} credit no longer follows ${flag}`); broke++; }

  /* "Study this without AI" opens a panel in this page — it is not one of
     these and must not get swept up with them */
  /* with the card off, the banner tab is the only way into the no-screen
     panel, so losing it would take the whole thing with it */
  if(!/id="offline-open"/.test(engine)){
    fail('the "Study without AI" tab in the banner has gone — nothing now opens the no-screen panel');
    broke++;
  }
  if(!/\$\('offline-open'\)\.addEventListener/.test(engine)){
    fail('the "Study without AI" tab no longer opens the panel'); broke++;
  }

  if(!broke)
    pass(on.length ? `${FLAGS.length - on.length} of ${FLAGS.length} switched off; on: ${on.join(', ')}`
                   : `all ${FLAGS.length} optional cards off, everything kept so they can be switched back`);
}

/* ---------- 5e. the tiles must stand off the panel behind them ---------- */
head('TILE SEPARATION');

{
  /* A tinted tile on a tinted panel sat 1.03:1 apart at the top of the panel
     gradient — close enough to invisible. The tile now uses plain --surface
     and the panel carries the colour; this keeps that true. */
  const lum = c => { const s2 = c.map(v => { v/=255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*s2[0] + 0.7152*s2[1] + 0.0722*s2[2]; };
  const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n)=>n-m);
    return (x+0.05)/(y+0.05); };
  const hexc = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  const blend = (a,b,p) => hexc(a).map((v,i) => Math.round(v*p + hexc(b)[i]*(1-p)));

  const tileRule = (engine.match(/\.tile\{background:([^;]+);/) || [])[1] || '';
  if(!/var\(--surface\)/.test(tileRule) || /--tint-in/.test(tileRule))
    fail('the mode tiles are tinted again — a tinted tile on a tinted panel is ' +
         'nearly invisible at the top of the panel gradient');
  else {
    const grab = (block, name) => {
      const m = engine.match(new RegExp(block + '[\\s\\S]*?--' + name + ':(\\d+)%'));
      return m ? parseInt(m[1],10)/100 : null;
    };
    const lightA = grab('--fac-dark:#002066', 'tint-a');
    const darkA  = grab('--fac-dark:#4d7fd6', 'tint-a');
    if(lightA === null || darkA === null) fail('could not read the panel tints');
    else {
      const lTop = ratio(hexc('#ffffff'), blend('#002066','#ffffff', lightA));
      const dTop = ratio(hexc('#101a2e'), blend('#4d7fd6','#101a2e', darkA));
      const page = ratio(blend('#002066','#ffffff', lightA), hexc('#eef2f7'));
      const panelDarker = lum(blend('#002066','#ffffff', lightA)) < lum(hexc('#eef2f7'));
      if(lTop < 1.08 || dTop < 1.08)
        fail(`tiles sit only ${lTop.toFixed(3)}:1 (light) and ${dTop.toFixed(3)}:1 (dark) ` +
             'from the panel behind them — raise --tint-a so the panel steps back');
      else if(panelDarker)
        fail(`--tint-a is ${(lightA*100).toFixed(0)}%, which makes the panel darker than the ` +
             'page behind it — cards should sit lighter than their background');
      else pass(`tiles stand ${lTop.toFixed(3)}:1 (light) and ${dTop.toFixed(3)}:1 (dark) off the panel`);
    }
  }
}

/* ---------- 6. build stamps agree ---------- */
head('BUILD STAMPS');

const engineBuild = (engine.match(/Engine build (\d+)/) || [])[1];
const ttBuild     = (ttSrc.match(/build (\d+) —/) || [])[1];
const bibBuild    = (bibSrc.match(/build (\d+) —/) || [])[1];
const versionTags = [...new Set([...engine.matchAll(/\.js\?v=(\d+)/g)].map(m => m[1]))];

if(!engineBuild) fail('the engine has no build stamp');
else if(engineBuild !== ttBuild)
  fail(`build mismatch: engine says ${engineBuild}, timetable says ${ttBuild}`);
else if(engineBuild !== bibBuild)
  fail(`build mismatch: engine says ${engineBuild}, bib.js says ${bibBuild}`);
else if(versionTags.length !== 1 || versionTags[0] !== engineBuild)
  fail(`cache tags (?v=${versionTags.join(',')}) do not match build ${engineBuild}`);
else pass(`build ${engineBuild}, all files and cache tags agree`);

/* ---------- 7. the files the engine asks for must exist ---------- */
head('FILE REFERENCES');

const wanted = new Set();
for(const m of engine.matchAll(/(?:src="|file:')([a-z0-9.\-]+\.js)(?:\?v=\d+)?/g)) wanted.add(m[1]);
for(const m of ttSrc.matchAll(/'(ncea-[a-z0-9.\-]+\.js)'/g)) wanted.add(m[1]);
let bad = 0;
for(const f of wanted){
  if(f.startsWith('http')) continue;
  if(!fs.existsSync(f)){ fail(`the engine loads "${f}", which is not in this folder`); bad++; }
}
if(!bad) pass(`${wanted.size} referenced files all present`);

/* ---------- 8. the bibliography builds correct APA, and cannot invent a source ---------- */
head('BIBLIOGRAPHY');

try {
  new Function(read(BIB))();                 // defines window.Bibliography
  const B = global.window.Bibliography;
  if(!B || typeof B.format !== 'function') throw new Error('window.Bibliography did not appear');

  /* A handful of references whose correct APA 7 form is not in dispute. If a
     change to the formatter breaks one of these, it has broken real citations. */
  const CASES = [
    [{ type:'book', authors:'Jared Diamond', year:'2005', title:'Collapse', publisher:'Penguin' },
     'Diamond, J. (2005). Collapse. Penguin.'],
    [{ type:'book', authors:'Smith, Jane\nAlan Jones', year:'2019', title:'Coasts',
       edition:'2nd', publisher:'Otago University Press' },
     'Smith, J., & Jones, A. (2019). Coasts (2nd ed.). Otago University Press.'],
    [{ type:'web', authors:'', fulldate:'2023-06-01', title:'Census 2023 results',
       site:'Stats NZ', url:'https://www.stats.govt.nz/c' },
     'Stats NZ. (2023, June 1). Census 2023 results. https://www.stats.govt.nz/c'],
    [{ type:'news', authors:'Simon Wilson', fulldate:'2025-02-10', title:'The ferry problem',
       paper:'The New Zealand Herald', url:'https://nzherald.co.nz/f' },
     'Wilson, S. (2025, February 10). The ferry problem. The New Zealand Herald. https://nzherald.co.nz/f'],
    [{ type:'journal', authors:'Kestin, G.\nMiller, K.', year:'2025', title:'AI tutoring',
       journal:'Scientific Reports', volume:'15', issue:'1', pages:'17458',
       doi:'10.1038/s41598-025-97652-6' },
     'Kestin, G., & Miller, K. (2025). AI tutoring. Scientific Reports, 15(1), 17458. https://doi.org/10.1038/s41598-025-97652-6'],
    [{ type:'chapter', authors:'Jane Smith', year:'2018', title:'Erosion',
       editors:'Alan Brown\nMary Green', booktitle:'New Zealand coastlines', pages:'112-130',
       publisher:'Canterbury University Press' },
     'Smith, J. (2018). Erosion. In A. Brown & M. Green (Eds.), New Zealand coastlines (pp. 112–130). Canterbury University Press.'],
    [{ type:'report', authors:'Ministry of Education', org:true, year:'2023',
       title:'Attendance', publisher:'Ministry of Education', url:'https://e.govt.nz/a' },
     'Ministry of Education. (2023). Attendance. https://e.govt.nz/a'],
    [{ type:'interview', authors:'Jane Smith', fulldate:'2026-03-04' },
     '(J. Smith, personal communication, March 4, 2026)']
  ];
  let wrong = 0;
  for(const [input, want] of CASES){
    const got = B.format(input);
    if(got !== want){ fail(`APA ${input.type}: got "${got}"`); wrong++; }
  }
  if(!wrong) pass(`${CASES.length} APA 7 reference forms correct`);

  const INTEXT = [
    [{ type:'book', authors:'Jared Diamond', year:'2005' }, '(Diamond, 2005)'],
    [{ type:'book', authors:'Smith, Jane\nAlan Jones', year:'2019' }, '(Smith & Jones, 2019)'],
    [{ type:'book', authors:'A Brown\nB Green\nC White', year:'2020' }, '(Brown et al., 2020)'],
    [{ type:'web', authors:'', site:'Stats NZ', fulldate:'2023-06-01' }, '(Stats NZ, 2023)']
  ];
  let badCite = 0;
  for(const [input, want] of INTEXT){
    const got = B.inText(input);
    if(got !== want){ fail(`in-text citation: got "${got}", wanted "${want}"`); badCite++; }
  }
  if(!badCite) pass(`${INTEXT.length} in-text citation forms correct`);

  /* The whole design rests on this module being unable to produce a source
     nobody read. Any network call here would break that promise. */
  const src = read(BIB) || '';
  const leaks = [
    [/\bfetch\s*\(/, 'calls fetch()'],
    [/XMLHttpRequest/, 'uses XMLHttpRequest'],
    [/createElement\(\s*['"](script|img|iframe)/, 'injects a remote element'],
    [/import\s*\(/, 'uses a dynamic import']
  ].filter(([re]) => re.test(src)).map(([, m]) => m);
  if(leaks.length) fail(`bib.js ${leaks.join(' and ')} — it must never fetch a source`);
  else pass('bib.js makes no network calls of any kind');

  if(!/do not add, suggest, supply, or invent any source/.test(src))
    fail('the AI checking prompt no longer forbids adding sources');
  else pass('the AI checking prompt still forbids adding sources');

} catch(e){
  fail('the bibliography module would not load: ' + e.message);
}

/* ---------- 9. study modes: every mode is whole, and its blocks resolve ---------- */
head('STUDY MODES');

{
  const modesSrc  = (engine.match(/const MODES = \{[\s\S]*?\n\};/) || [''])[0];
  const blocksSrc = (engine.match(/const BLOCKS = \{[\s\S]*?\n\};/) || [''])[0];

  if(!modesSrc || !blocksSrc) fail('could not find the MODES or BLOCKS tables');
  else {
    const blockKeys = new Set([...blocksSrc.matchAll(/^([a-z]+):`/gm)].map(m => m[1]));
    const modes = [...modesSrc.matchAll(/^([a-z]+):\{([\s\S]*?)(?=\n[a-z]+:\{|\n\};)/gm)];

    if(modes.length < 9) fail(`only ${modes.length} study modes found; expected at least 9`);
    else pass(`${modes.length} study modes, ${blockKeys.size} shared blocks`);

    /* A typo in a blocks array silently drops that block from the prompt with
       no error anywhere, so it is worth checking the names resolve. */
    const byModeEarly = Object.fromEntries(modes.map(([, k, body]) => [k, body]));
    let badRef = 0;
    for(const [, key, body] of modes){
      const arr = (body.match(/blocks:\[([^\]]*)\]/) || [, ''])[1];
      for(const raw of arr.split(',')){
        const name = raw.trim().replace(/^['"]|['"]$/g, '');
        if(!name) continue;
        /* 'parallel' is swapped for 'worked' on externally assessed standards */
        if(!blockKeys.has(name) && name !== 'parallel'){
          fail(`mode "${key}" asks for block "${name}", which does not exist`);
          badRef++;
        }
      }
      for(const f of ['label', 'blurb', 'body'])
        if(!new RegExp(f + ':').test(body)){ fail(`mode "${key}" has no ${f}`); badRef++; }
    }
    if(!badRef) pass('every block each mode asks for exists, and no mode is missing a field');

    /* renderModes now iterates the GROUPS, not MODES — so a mode left out of
       every group does not render at all, with no error anywhere. This is the
       check that catches that. */
    const groupsSrc = (engine.match(/const MODE_GROUPS = \[[\s\S]*?\n\];/) || [''])[0];
    if(!groupsSrc) fail('could not find the MODE_GROUPS table');
    else {
      const grouped = [];
      for(const g of groupsSrc.matchAll(/modes:\[([^\]]*)\]/g))
        for(const raw of g[1].split(','))
          { const n = raw.trim().replace(/^['"]|['"]$/g,''); if(n) grouped.push(n); }
      const modeKeys = modes.map(m => m[1]);
      const orphan = modeKeys.filter(k => !grouped.includes(k));
      const ghost  = grouped.filter(k => !modeKeys.includes(k));
      const dupe   = grouped.filter((k,i) => grouped.indexOf(k) !== i);
      if(orphan.length) fail(`mode(s) in no group, so they never render: ${orphan.join(', ')}`);
      if(ghost.length)  fail(`group(s) list a mode that does not exist: ${ghost.join(', ')}`);
      if(dupe.length)   fail(`mode(s) listed in more than one group: ${dupe.join(', ')}`);

      const labels = [...groupsSrc.matchAll(/label:'([^']+)'/g)].map(m => m[1]);
      const steers = [...groupsSrc.matchAll(/steer:'([^']+)'/g)].map(m => m[1]);
      if(labels.length !== steers.length)
        fail(`${labels.length} group labels but ${steers.length} steer lines`);
      if(!/\.mgroup-h\{/.test(engine) || !/\.mgroup-tiles\{/.test(engine))
        fail('the mode-group styles are missing, so the headings will be unstyled');
      if(!orphan.length && !ghost.length && !dupe.length && labels.length === steers.length)
        pass(`${labels.length} mode groups cover all ${modeKeys.length} modes exactly once`);
    }

    /* Gating belongs on the mode. Restating it at each call site is how the
       stale-selection bug got in: the reset only ever checked one mode. */
    const GATED = { ownnotes:'externally assessed standards only',
                    reference:'standards whose content the standard itself fixes' };
    let gateBad = 0;
    for(const [key, why] of Object.entries(GATED)){
      if(!byModeEarly[key]){ fail(`mode "${key}" is missing`); gateBad++; continue; }
      if(!/only:\s*st\s*=>/.test(byModeEarly[key])){
        fail(`mode "${key}" no longer declares its own "only" rule (${why})`); gateBad++;
      }
    }
    if(/!==\s*'reference'|sel\.std\.reference/.test(engine)){
      fail('a mode is still gated by a hardcoded check instead of its "only" rule');
      gateBad++;
    }
    if(!/function modeFits\(/.test(engine)){
      fail('modeFits is gone, so nothing applies the "only" rules'); gateBad++;
    }
    if(!gateBad) pass(`${Object.keys(GATED).length} gated modes declare their own rule, applied in one place`);

    /* Colour runs on one axis: the group. A per-mode accent would put it back
       to one-offs, and a bare accent fails AA in one theme or the other, so
       both mix rules have to survive too. */
    const strayAccent = /^[a-z]+:\{[\s\S]*?accent:'#/m.test(modesSrc) &&
      [...modesSrc.matchAll(/^([a-z]+):\{([\s\S]*?)(?=\n[a-z]+:\{|\n\};)/gm)]
        .filter(m => /accent:'#/.test(m[2])).map(m => m[1]);
    if(strayAccent && strayAccent.length)
      fail(`mode(s) carry their own accent instead of taking the group's: ${strayAccent.join(', ')}`);

    const gAccents = [...groupsSrc.matchAll(/accent:'(#[0-9a-f]{6})'/gi)].map(m => m[1].toLowerCase());
    const gLabels  = [...groupsSrc.matchAll(/label:'([^']+)'/g)].map(m => m[1]);
    const dupeColour = gAccents.filter((c,i) => gAccents.indexOf(c) !== i);

    /* colours the rest of the page has already claimed */
    const RESERVED = { '#0d9488':'the external-site cards', '#b45309':'the no-screen card',
                       '#db2026':'the recommended banner', '#002066':'the brand navy' };
    const clash = gAccents.filter(c => RESERVED[c]).map(c => `${c} (${RESERVED[c]})`);

    const lightRule = /\.mgroup \.tile \.hd\{ color:color-mix\(in srgb, var\(--fac-dark\) \d+%, #000\)/.test(engine);
    const darkRule  = /body\.dark-mode \.mgroup \.tile \.hd\{ color:color-mix\(in srgb, var\(--fac-dark\) \d+%, #fff\)/.test(engine);
    const headDark  = /body\.dark-mode \.mgroup-h\{ color:color-mix\(in srgb, var\(--fac-dark\) \d+%, #fff\)/.test(engine);
    /* dashed must mean exactly one thing here: this leaves the prompt builder */
    const tileDashed = /\.mgroup \.tile\{[^}]*border-style:dashed/.test(engine);

    let colourBad = 0;
    if(gAccents.length !== gLabels.length){
      fail(`${gLabels.length} groups but ${gAccents.length} accents — every group needs its own`); colourBad++; }
    if(dupeColour.length){ fail(`two groups share a colour: ${dupeColour.join(', ')}`); colourBad++; }
    if(clash.length){ fail(`group accent reuses a colour already meaning something else: ${clash.join(', ')}`); colourBad++; }
    if(!(lightRule && darkRule && headDark)){
      fail('the light/dark contrast mixes for group colour are missing — a raw accent fails AA in one theme'); colourBad++; }
    if(tileDashed){ fail('mode tiles are dashed, which is reserved for cards that leave the prompt builder'); colourBad++; }
    if(!colourBad && !(strayAccent && strayAccent.length))
      pass(`${gAccents.length} group colours, all distinct, none reserved, both theme mixes present`);


    /* Colours must not only differ, they must sit at a similar INTENSITY.
       A vivid purple beside a muted blue reads as a mistake even when every
       contrast ratio passes — which is exactly what happened at build 85,
       where violet and magenta were twice as colourful as blue and green. */
    {
      const lin = v => { v /= 255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      const chroma = h => {
        const [r,g,b] = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)).map(lin);
        const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
        const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
        const s2= Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
        return Math.hypot(1.9779984951*l - 2.4285922050*m + 0.4505937099*s2,
                          0.0259040371*l + 0.7827717662*m - 0.8086757660*s2);
      };
      const cs = gAccents.map(chroma);
      if(cs.length){
        const spread = Math.max(...cs) / Math.min(...cs);
        if(spread > 1.5){
          const worst = gAccents[cs.indexOf(Math.max(...cs))];
          fail(`group colours are ${spread.toFixed(2)}x apart in intensity — ${worst} is far more ` +
               'vivid than the others and will read as brighter. Keep them within 1.5x.');
        } else pass(`group colours sit within ${spread.toFixed(2)}x of each other in intensity`);
      }
    }

    /* The lines these modes genuinely rest on. Editing the prose is fine;
       losing one quietly changes what the tool does. Each rule is checked
       against ITS OWN mode's body — a phrase that also appears in another
       mode must not be allowed to cover for its removal here. */
    const byMode = Object.fromEntries(modes.map(([, k, body]) => [k, body]));
    const LOAD_BEARING = {
      ownnotes: [
        [/Then STOP and wait/,              'tells the model to wait for the material'],
        [/Do not teach anything/,           'forbids teaching before the material arrives'],
        [/content you invented/,            'says why waiting matters'],
        [/NEVER SILENTLY FILL A GAP/,       'forbids silently filling gaps in the notes'],
        [/This is not in your notes/,       'requires every gap to be labelled'],
        [/NEVER OVERRULE THEIR TEACHER/,    'defers to the teacher over its own priors'],
        [/Only once you have done 1 and 2/, 'gates drilling behind the coverage and depth audit'],
        [/Never attach a grade to it/,      'refuses to grade the notes'],
        [/Feedback on my writing/,          'redirects an assessed draft to the feedback mode']
      ],
      feedback: [
        [/DO NOT GIVE IT A GRADE/,          'refuses to grade the work'],
        [/Never supply the sentence/,       'will not write their missing paragraph']
      ],
      feynman: [
        [/Then STOP\. Do not explain anything yourself/, 'refuses to explain before the student does'],
        [/fluent nonsense feels exactly like understanding/, 'names the failure only it can catch'],
        [/WRONG BUT FLUENT/,               'hunts for confident wrong statements first'],
        [/JARGON STANDING IN FOR MECHANISM/, 'catches a term used in place of an explanation'],
        [/Do not open with praise for the explanation as a whole/,
                                           'refuses to open with blanket praise'],
        [/Make them repair it/,            'makes the student fix it rather than fixing it for them']
      ],
      exam:     [[/Then STOP and wait/,     'waits rather than marking its own questions']],
      exemplar: [[/Achieved/,               'still describes the Achieved band']]
    };
    let lost = 0, rules = 0;
    for(const [mode, checks] of Object.entries(LOAD_BEARING)){
      if(!byMode[mode]){ fail(`mode "${mode}" has gone missing entirely`); lost++; continue; }
      for(const [re, what] of checks){
        rules++;
        if(!re.test(byMode[mode])){ fail(`"${mode}" mode no longer ${what}`); lost++; }
      }
    }
    /* CORE sits outside the MODES table and applies in every mode. */
    rules++;
    if(!/NEVER GRADE THE STUDENT'S OWN WORK/.test(engine)){
      fail('CORE no longer refuses to grade the student\'s own work'); lost++;
    }
    if(!lost) pass(`${rules} load-bearing prompt rules still present, each in its own mode`);
  }
}

/* ---------- result ---------- */
function report(){
  console.log('\n' + '─'.repeat(52));
  if(failures) console.log(`\x1b[31m${failures} failure${failures===1?'':'s'}\x1b[0m` +
    (warnings ? `, ${warnings} warning${warnings===1?'':'s'}` : ''));
  else console.log(`\x1b[32mAll checks passed\x1b[0m` +
    (warnings ? ` — ${warnings} warning${warnings===1?'':'s'} worth a look` : ''));
  process.exit(failures ? 1 : 0);
}
report();
