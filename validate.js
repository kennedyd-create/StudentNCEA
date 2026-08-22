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
const TT     = 'timetable.js';

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

for(const f of [...DATA, EXAMS, TT]){
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
  [EXAMS, ...DATA].forEach(f => { if(fs.existsSync(f)) new Function(read(f))(); });
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

/* ---------- 5. every class used has a style ---------- */
head('STYLES');

const ttSrc = read(TT) || '';
const classesUsed = new Set();
for(const src of [ttSrc, ...inline]){
  for(const m of src.matchAll(/class="([^"]*)"/g)){
    for(const tok of m[1].split(/[\s${}?:'"()+]+/)){
      // a class ending in '-' is a built prefix like tt-sit-${v}; skip it
      if(/^(tt-|btn-|seg$|crumb|sit-|pl-|whs-contour|brief)/.test(tok) && tok.length > 2)
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
const versionTags = [...new Set([...engine.matchAll(/\.js\?v=(\d+)/g)].map(m => m[1]))];

if(!engineBuild) fail('the engine has no build stamp');
else if(engineBuild !== ttBuild)
  fail(`build mismatch: engine says ${engineBuild}, timetable says ${ttBuild}`);
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
