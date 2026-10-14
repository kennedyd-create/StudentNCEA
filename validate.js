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
      if(/^(tt-|bib-|btn-|seg$|crumb|sit-|pl-|whs-contour|brief)/.test(tok) && tok.length > 2)
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
                         'tt-ph','tt-zero','tt-ctxfield','tt-stdctx']);
const unstyled = [...classesUsed].filter(c => {
  if(JS_ONLY.has(c)) return false;
  if(c.endsWith('-')) return false;                 // a built prefix like tt-sit-${v}
  const rule = new RegExp('\\.' + c + '[\\s,{:.\\[]');
  const where = c.startsWith('pl-') ? printCss : engine;   // print styles live in the print window
  return !rule.test(where);
});
if(unstyled.length) fail(`classes used but never styled: ${unstyled.join(', ')}`);
else pass(`${classesUsed.size} classes checked, all styled`);

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
