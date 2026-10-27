/* ============================================================
   WRITING — paragraph shapes and sentence craft

   Two tools, and the line between them matters.

   The ANALYSER is pure string work: it counts sentences, reads how
   each one opens, and names the constructions the paragraph has not
   used. No AI, no network, no judgement about quality — just what
   is measurably there. It needs no standard and works on anything.

   The BUILDER asks questions and holds the order. It never writes a
   sentence. A tool that supplies the words would be writing the
   student's assessment for them, and 48 of the 80 standards this
   appears on are internally assessed.

   The paragraph shapes are classical rhetoric — deduction,
   induction, compare and contrast, cause and effect, concession —
   named here in the language NCEA itself uses.
   ============================================================ */
(function () {

const W_BUILD = 'build 91 — writing tools';

const R = () => document.getElementById('writing-root');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- state ---------- */

const KEY = 'ncea_writing_v1';
/* picking is the one part of the state that is never saved: whether the
   standard list is open is a this-moment thing, not something to restore. */
let S = { std: null, shape: null, answers: {}, draft: '', tab: 'build', picking: false, idea: null, lastStep: null, used: {}, recent: [], shapeOpen: false,
          nav: {} };   // where they are in the level/faculty/subject drill-down

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({
    std: S.std, shape: S.shape, answers: S.answers, draft: S.draft, tab: S.tab,
    used: S.used, recent: S.recent })); }
  catch(e){ /* private browsing or a full quota — not worth interrupting them */ }
}
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(o){ S.std = o.std || null; S.shape = o.shape || null;
      S.answers = o.answers || {}; S.draft = o.draft || '';
      S.tab = o.tab === 'check' ? 'check' : 'build';
      S.used = (o.used && typeof o.used === 'object') ? o.used : {};
      S.recent = Array.isArray(o.recent) ? o.recent : []; }
  }catch(e){ /* corrupt store: start clean rather than die */ }
}

/* ============================================================
   WHICH STANDARDS THIS IS FOR
   Standards whose assessment produces extended prose. Read from
   the standard's own format and evidence lines rather than a flag,
   so the data files stay untouched; the validator checks the count
   stays in a sane band in case a future data edit moves it.
   ============================================================ */

const WRITING_RE = /essay|extended (writing|response)|sustained|paragraph|written response|report|argument/i;
const isWriting = st => !!st && (WRITING_RE.test(st.format || '') || WRITING_RE.test(st.evidence || ''));

const LEVEL_NAME = { '1':'Level 1', '2':'Level 2', '3':'Level 3', 'S':'Scholarship' };

function allWritingStandards(){
  const D = window.NCEA_DATA || {};
  const out = [];
  for(const lvl of ['1','2','3','S']){
    const d = D[lvl]; if(!d) continue;
    for(const [subject, s] of Object.entries(d.subjects || {}))
      for(const st of s.standards || [])
        if(isWriting(st)) out.push({ level: lvl, subject, st });
  }
  return out;
}
const findStd = (level, code) => allWritingStandards()
  .find(x => x.level === level && x.st.code === code) || null;

/* The level files load on demand, and a student may open this tab before
   they have opened the study guide. Rather than sending them to another
   tab to fetch the data, fetch it here and redraw when it lands. */
let loading = false, loadFailed = false;
function ensureLevels(){
  if(loading || loadFailed) return;
  if(typeof window.nceaLoadLevel !== 'function'){ loadFailed = true; return; }
  loading = true;
  Promise.all(['1','2','3','S'].map(id =>
    window.nceaLoadLevel(id).catch(() => null)
  )).then(() => {
    loading = false;
    if(!allWritingStandards().length) loadFailed = true;
    render();
  }).catch(() => { loading = false; loadFailed = true; render(); });
}

/* ============================================================
   THE PARAGRAPH SHAPES
   Each is a sequence of questions. The student answers in their own
   sentences; the tool only decides what order they go in and what
   each one has to do.
   ============================================================ */

const SHAPES = [
  { group:'Body paragraphs' },

  { id:'claim', name:'Claim and proof', also:'deductive',
    use:'State your point, then prove it. This is the one nearly every student defaults to \u2014 which is the reason to be deliberate about choosing it rather than falling into it.',
    deepen:'What is the strongest reason someone could give against this claim, and why does your evidence still hold?',
    steps:[
      { q:'What is your claim?',
        hint:'One sentence, no hedging. The thing you are going to prove.' },
      { q:'What is your strongest piece of evidence for it?',
        hint:'Specific: a quotation, a figure, a date, a named example. Not "there is evidence that…".' },
      { q:'How does that evidence prove the claim?',
        hint:'This is the sentence most students skip, and it is where Merit lives. Spell out the link.' },
      { q:'What does this establish for the larger question?',
        hint:'Tie it back to what the essay or report is actually about.' }
    ]},

  { id:'cause', name:'Cause, process, result',
    use:'For explaining how something works or happens. Common in science, geography and economics.',
    deepen:'Which step in that process mattered most, and how do you know?',
    steps:[
      { q:'What sets it off?', hint:'The trigger or starting condition.' },
      { q:'What happens, step by step?',
        hint:'The mechanism. Each step should follow from the one before, not just come after it.' },
      { q:'What is the result?', hint:'The outcome, stated precisely.' },
      { q:'Why does that result matter here?',
        hint:'Connect it to the case, place, organism or situation you were asked about.' }
    ]},

  { id:'angles', name:'One point, several angles',
    use:'When a single point needs more than one kind of support to be convincing.',
    deepen:'Which of those angles carries the most weight, and why that one?',
    steps:[
      { q:'What is the point?', hint:'One sentence.' },
      { q:'First angle, with its evidence', hint:'' },
      { q:'Second angle, from a different kind of evidence', hint:'Different in kind, not just another example of the same thing.' },
      { q:'What do they together establish that neither does alone?',
        hint:'If the answer is "the same thing twice", you need a different second angle.' }
    ]},

  { id:'compare', name:'Compare and weigh',
    use:'Two things side by side. The weighing at the end is what lifts it above a list.',
    deepen:'What does the comparison itself show that neither side shows on its own?',
    steps:[
      { q:'What two things are you comparing, and on what basis?',
        hint:'Name the basis. Comparing two things on no stated criterion is where these paragraphs fall down.' },
      { q:'Where do they agree?', hint:'' },
      { q:'Where do they differ, and on what exactly?', hint:'' },
      { q:'Which matters more for your argument, and why?',
        hint:'Do not leave this to the reader. Weighing is the Merit-to-Excellence move in most standards.' }
    ]},

  { id:'build', name:'Build to the judgement', also:'inductive',
    use:'Evidence first, conclusion last. Useful when the conclusion would look unearned if you led with it.',
    deepen:'What would have to be true for your judgement to be wrong?',
    steps:[
      { q:'First piece of evidence', hint:'Start with the least contentious.' },
      { q:'Second piece, from elsewhere', hint:'' },
      { q:'Third piece', hint:'' },
      { q:'What follows from all three that was not obvious at the start?',
        hint:'If your conclusion was already obvious after the first sentence, use Claim and proof instead.' }
    ]},

  { id:'counter', name:'The counter-argument',
    use:'Taking on the strongest objection. Nearly every Excellence criterion rewards this somewhere.',
    deepen:'What does the objection get right, and how far does that change your position?',
    steps:[
      { q:'What would someone who disagrees with you say?',
        hint:'Put it at its strongest. A weak version you can knock over proves nothing.' },
      { q:'What is their best evidence?', hint:'' },
      { q:'What does that view get right?',
        hint:'Concede something real. This is what makes the rest credible.' },
      { q:'Why does your position still hold?',
        hint:'Answer their evidence, do not just restate yours.' }
    ]},

  { id:'quote', name:'Working with a quotation',
    use:'For English, History, Classical Studies and Media Studies, where a dropped-in quote earns nothing.',
    deepen:'What does the writer gain by putting it this way rather than plainly?',
    steps:[
      { q:'What is happening at this point?',
        hint:'Set it up in a clause, not a whole sentence. "When Macbeth returns from the murder…"' },
      { q:'The quotation itself',
        hint:'Short. Embed it in your own sentence rather than standing it alone.' },
      { q:'What technique or choice is at work?',
        hint:'Name it precisely — the word, the image, the shot, the structure. Not "the writer uses language".' },
      { q:'What effect does it have, and why does that matter to your argument?',
        hint:'Effect on the reader or audience, then back to your point.' }
    ]},

  { group:'Opening and closing' },

  { id:'intro', name:'Opening a piece',
    use:'Sets up the question and your line on it. No throat-clearing about how since the dawn of time.',
    deepen:'What is the tension in the question that makes it worth answering at all?',
    steps:[
      { q:'What is the question actually asking?',
        hint:'In your own words. Getting this wrong is the single most expensive mistake in any exam.' },
      { q:'What is your line on it?',
        hint:'Your argument in one sentence. The marker should know your answer before they read the body.' },
      { q:'What will you cover, and in what order?',
        hint:'Brief. A map, not a summary.' }
    ]},

  { id:'conclusion', name:'Closing a piece',
    use:'Does more than repeat the introduction.',
    deepen:'What does your argument not settle, and why does that not undo it?',
    steps:[
      { q:'What has your evidence established?',
        hint:'What you have shown, not what you set out to show.' },
      { q:'So what is the answer to the question?',
        hint:'Answer it directly, in the question’s own terms.' },
      { q:'Why does it matter beyond this essay?',
        hint:'One sentence. Significance, not a new argument.' }
    ]}
];

/* ============================================================
   WHAT CHANGES BETWEEN LEVELS
   A Level 1 paragraph and a Level 3 paragraph are not the same
   job, so the questions should not be either. Two things change
   with the level: an extra question that pushes the move the
   level is actually marked on, and a line saying what is
   expected of the paragraph as a whole.

   TEACHER REVIEW: these are generic writing expectations in
   NCEA's terms, written here as drafts \u2014 they are not NZQA
   wording. The band shift shown beside them IS from the
   standard's own data.
   ============================================================ */

const LEVEL_EXPECT = {
  '1': { line:'One point per paragraph. Name your evidence, then spend a whole sentence saying how it proves the point \u2014 that sentence is where most marks go missing at Level 1.',
         shape:'Three or four sentences is a normal paragraph here.' },
  '2': { line:'Same shape, harder explaining. Merit at Level 2 is depth on one point, not more points: show how the thing worked, not just that it did.',
         shape:'Four to six sentences. Change how they open.' },
  '3': { line:'Depth is assumed at Level 3; what is marked is judgement. Weigh things against each other, say which mattered more, and make the reason for "more" explicit.',
         shape:'Five to seven sentences, at least one of which concedes or qualifies something.' },
  'S': { line:'Scholarship rewards a position that has already met the best objection to it and still stands. Assume the reader knows the content and is reading for your thinking.',
         shape:'Length is not the point. One exact sentence beats three careful ones.' }
};

/* Level 3 and Scholarship add the shape's deepening question; Scholarship
   adds one more that turns the paragraph on its own assumptions. */
const SCHOL_STEP = { q:'What does this paragraph take for granted, and would someone who knows the subject grant it?',
  hint:'Scholarship only. Name the assumption rather than hiding it.' };

function levelOf(){ return S.std ? S.std.level : null; }

function stepsFor(sh){
  const lvl = levelOf();
  const out = sh.steps.slice();
  if((lvl === '3' || lvl === 'S') && sh.deepen) out.push({ q:sh.deepen, deep:true });
  if(lvl === 'S') out.push(Object.assign({ deep:true }, SCHOL_STEP));
  return out;
}

const shapeById = id => SHAPES.find(s => s.id === id) || null;

/* ============================================================
   THE SENTENCE ANALYSER
   Everything below is measured, not judged. It reports what the
   paragraph does and names constructions it has not used.
   ============================================================ */

/* Abbreviations that end in a full stop but not a sentence. */
const ABBR = /\b(mr|mrs|ms|dr|prof|st|vs|etc|eg|ie|approx|fig|no|cf|ibid|al)\.$/i;

function sentences(text){
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if(!t) return [];
  const out = []; let buf = '';
  for(const part of t.split(/(?<=[.!?])\s+/)){
    buf += (buf ? ' ' : '') + part;
    /* keep going if this looks like an abbreviation or a bare initial */
    if(ABBR.test(buf) || /\b[A-Z]\.$/.test(buf)) continue;
    out.push(buf.trim()); buf = '';
  }
  if(buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

const PREPS = new Set(['in','on','at','by','for','from','with','without','under','over','above',
  'below','beneath','beyond','through','across','against','along','among','around','before',
  'behind','between','during','despite','except','inside','into','near','outside','past','since',
  'throughout','towards','toward','until','upon','within','after','amid','beside','off','onto']);
const WWORDS = new Set(['when','while','whereas','where','whenever','wherever','whether','which',
  'who','whom','whose','why','what','although','though','because','if','unless','since','as']);
const CONJ = new Set(['and','but','or','so','yet','however','therefore','moreover','furthermore',
  'nevertheless','nonetheless','consequently','meanwhile','instead','besides','thus','hence']);

/* How a sentence opens. One label per sentence, first match wins. */
function opener(sentence){
  const words = sentence.replace(/^[“"'(\[]+/, '').split(/\s+/);
  const w0 = (words[0] || '').toLowerCase().replace(/[^a-z’'-]/g, '');
  if(!w0) return 'other';
  if(CONJ.has(w0))  return 'conjunction';
  if(WWORDS.has(w0)) return 'subordinate';
  if(PREPS.has(w0)) return 'preposition';
  if(/ing$/.test(w0) && w0.length > 4) return 'participle-ing';
  if(/ed$/.test(w0) && w0.length > 4)  return 'participle-ed';
  if(/ly$/.test(w0) && w0.length > 3)  return 'adverb';
  return 'subject';
}

const OPENER_NAME = {
  subject:'starts with the subject', adverb:'starts with an adverb',
  preposition:'starts with a preposition', 'participle-ing':'starts with an -ing verb',
  'participle-ed':'starts with an -ed verb', subordinate:'starts with a subordinate clause',
  conjunction:'starts with a connective', other:'other'
};

const wordCount = s => (String(s).trim().match(/[\w’'-]+/g) || []).length;

function analyse(text){
  const ss = sentences(text);
  const rows = ss.map(s => ({
    text: s, words: wordCount(s), opener: opener(s),
    semicolon: s.includes(';'), dash: /—|–|--/.test(s), colon: /:/.test(s)
  }));
  const n = rows.length;
  const lens = rows.map(r => r.words);
  const openers = {};
  for(const r of rows) openers[r.opener] = (openers[r.opener] || 0) + 1;

  /* same opening word twice or more */
  const firsts = {};
  for(const r of rows){
    const w = (r.text.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z’'-]/g,'');
    if(w) firsts[w] = (firsts[w] || 0) + 1;
  }
  const repeated = Object.entries(firsts).filter(([,c]) => c > 1)
    .sort((a,b) => b[1] - a[1]).map(([w,c]) => ({ word:w, count:c }));

  return {
    sentences: rows, count: n,
    words: lens.reduce((a,b) => a+b, 0),
    avg: n ? Math.round(lens.reduce((a,b) => a+b, 0) / n) : 0,
    shortest: n ? Math.min(...lens) : 0,
    longest:  n ? Math.max(...lens) : 0,
    openers, repeated,
    semicolons: rows.filter(r => r.semicolon).length,
    dashes:     rows.filter(r => r.dash).length,
    colons:     rows.filter(r => r.colon).length
  };
}

/* Suggestions are about VARIETY, never about whether the content is
   any good — the tool has no way to judge that and must not pretend. */
/* Generic constructions, with an example of the FORM rather than a sentence
   worth stealing: every example is about erosion or the Waikato, so none of
   them can be dropped into a student's own paragraph and left there.
   'opener' ones can be detected in a finished paragraph, so the report knows
   which have been used; 'inside' ones cannot, so the report leaves them be
   and they appear only as ideas while writing. */
const MOVES = [
  { key:'preposition', cat:'opener', label:'Open one with a preposition',
    why:'Puts the time, place or condition first and gets you out of subject-verb-object.',
    eg:'By 1863, the Crown had already decided on invasion.',
    frame:'By [when], ' },
  { key:'participle-ing', cat:'opener', label:'Open one with an -ing verb',
    why:'Links an action to the main clause without a connective.',
    eg:'Facing falling yields, the farmers changed their irrigation.',
    frame:'[Verb]ing [what], ' },
  { key:'participle-ed', cat:'opener', label:'Open one with an -ed verb',
    why:'Describes the subject before you name it.',
    eg:'Weakened by erosion, the cliff face collapsed within a decade.',
    frame:'[Verb]ed by [what], ' },
  { key:'subordinate', cat:'opener', label:'Open one with While, Although or Because',
    why:'Shows the relationship between two ideas rather than stating them in sequence.',
    eg:'Although the data showed a rise, the sample was too small to be conclusive.',
    frame:'Although [what is true], ' },
  { key:'adverb', cat:'opener', label:'Open one with an adverb',
    why:'Sets the manner or degree up front.',
    eg:'Gradually, the sediment built up behind the groyne.',
    frame:'[Adverb]ly, ' },

  { key:'appositive', cat:'inside', label:'Name it, then define it between commas',
    why:'Gets a definition in without a whole sentence spent on it. Useful whenever a marker needs to see you know the term.',
    eg:'Longshore drift, the movement of sediment along a shore, had shifted the whole beach north.',
    frame:'[Term], [what it means], ' },
  { key:'colon', cat:'inside', label:'Use a colon to deliver what you just promised',
    why:'Sets an expectation in the first half and meets it in the second. Strong for a definition, a list, or a single telling example.',
    eg:'One factor outweighed the rest: the land itself.',
    frame:'[The set-up]: ' },
  { key:'semicolon', cat:'inside', label:'Join two linked ideas with a semicolon',
    why:'Holds two ideas in one sentence so the reader sees they belong together, without a connective doing the work.',
    eg:'The groyne trapped sediment on one side; the beach beyond it narrowed every year.',
    frame:'[First idea]; [the idea it leads to].' },
  { key:'dashes', cat:'inside', label:'Drop detail in between a pair of dashes',
    why:'Adds a qualification mid-sentence without starting a new one. Use once in a paragraph, not twice.',
    eg:'The cliff — undercut, saturated and unsupported — failed in a single night.',
    frame:'[Subject] \u2014 [the detail] \u2014 [verb] [rest].' },
  { key:'triple', cat:'inside', label:'Three items, each bigger than the last',
    why:'Three is the shortest group that reads as a pattern. Put the weightiest one last.',
    eg:'The confiscation took their farms, their river and their authority.',
    frame:'[One], [two] and [the biggest one].' },
  { key:'short', cat:'inside', label:'Follow a long sentence with a very short one',
    why:'A five-word sentence after a thirty-word one lands hard. This is how you signal the point that matters.',
    eg:'The land itself was the prize.',
    frame:'[Five words or fewer].' },

  /* ---- advanced: Level 3 and Scholarship, and only where the subject's own
     writing actually rewards them. These are rhetorical constructions; in a
     Level 1 paragraph they read as strain rather than control, which is why
     they are gated. TEACHER REVIEW: the subject lists below are my judgement,
     not NZQA's. ---- */
  { key:'midparticiple', cat:'advanced', label:'Put the participle in the middle',
    why:'Interrupts the main clause to qualify the subject before the verb lands. Packs a second idea in without a second sentence.',
    eg:'The Crown, having already massed troops on the border, treated the refusal as a pretext.',
    frame:'[Subject], having [done what], [main verb] [rest].' },
  { key:'periodic', cat:'advanced', label:'Hold the main clause until the end',
    why:'Everything qualifies first and the point lands last, so the reader has to take the conditions on board before the claim arrives. Use once in a piece, for the sentence that matters most.',
    eg:'Because the boundary had been set, because the Crown knew it, and because the troops crossed anyway, the invasion was deliberate.',
    frame:'Because [one], because [two], and because [three], [the point].',
    subjects:/english|history|classical|media|art history|geography|economics|psychology|health|education/i },
  { key:'inversion', cat:'advanced', label:'Invert it for emphasis',
    why:'Putting the adverb first and the auxiliary before the subject throws weight onto the thing you fronted. Striking once, mannered twice.',
    eg:'Rarely had a single boundary carried so much weight.',
    frame:'Rarely [had/has/did] [subject] [verb] [rest].',
    subjects:/english|history|classical|media|art history/i },
  { key:'antithesis', cat:'advanced', label:'Set one thing against another',
    why:'Balances what it is not against what it is, in one sentence. Built for judgement writing, where the marker wants to see you rule something out as well as in.',
    eg:'The war was fought not over sovereignty but over land.',
    frame:'[Subject] [verb] not [what it is not] but [what it is].' }
];
const OPENER_MOVES = MOVES.filter(m => m.cat === 'opener');

/* Advanced constructions appear only at Level 3 and Scholarship, and only
   for subjects whose writing rewards them. Everything else is always on. */
function movesFor(cat){
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  return MOVES.filter(m => {
    if(m.cat !== cat) return false;
    if(cat !== 'advanced') return true;
    if(!cur || (cur.level !== '3' && cur.level !== 'S')) return false;
    return !m.subjects || m.subjects.test(cur.subject);
  });
}

function suggestions(a){
  const out = [];
  if(!a.count) return out;

  const subj = a.openers.subject || 0;
  if(a.count >= 3 && subj / a.count >= 0.75)
    out.push({ head:`${subj} of your ${a.count} sentences start with the subject.`,
      body:'That is the default shape, and a paragraph built only from it reads flat however good the content is. Try one of these.' });

  if(a.repeated.length)
    out.push({ head:`You start ${a.repeated[0].count} sentences with the same word: “${a.repeated[0].word}”.`,
      body:'Markers notice repetition at the start of sentences more than anywhere else. Change one.' });

  if(a.count >= 4 && a.longest - a.shortest <= 6)
    out.push({ head:`Every sentence is about the same length (${a.shortest}–${a.longest} words).`,
      body:'A short sentence after two long ones lands hard. Try cutting one down to five or six words.' });

  if(a.count >= 3 && a.longest >= 40)
    out.push({ head:`Your longest sentence is ${a.longest} words.`,
      body:'Over about 35 words a reader loses the thread. Look for a natural break — often where you wrote “and” or “which”.' });

  if(a.count >= 4 && !a.semicolons && !a.dashes)
    out.push({ head:'No semicolons or dashes anywhere.',
      body:'A semicolon joins two closely linked ideas without a connective; a pair of dashes — like this — adds detail mid-sentence. One of each is plenty in a paragraph.' });

  /* the constructions this paragraph has not used at all */
  const unused = OPENER_MOVES.filter(m => !a.openers[m.key]);
  if(unused.length) out.push({ moves: unused.slice(0, 3) });
  return out;
}

/* ============================================================
   RENDER
   ============================================================ */

function render(){
  const r = R(); if(!r) return;
  r.innerHTML = head() + tabs() +
    (S.tab === 'check' ? checkPane() : buildPane()) + foot();
  wire();
}

function head(){
  return `<div class="panel p-5">
    <h2 class="wr-h">Writing</h2>
    <p class="wr-lead">Two tools for the writing standards. <strong>Shape a paragraph</strong> asks
    you the questions a particular kind of paragraph has to answer, in order, and you write the
    sentences. <strong>Check a paragraph</strong> reads one you have already written and tells you
    what it does — how many sentences, how each one opens, what you have not tried.</p>
    <p class="wr-warn"><strong>Neither tool writes a sentence for you.</strong> One gives you the
    questions, the other counts what is there. The sentence ideas can drop in a skeleton with the
    gaps marked \u2014 <code>Although [what is true], </code> \u2014 but you fill every gap. Every
    word in your paragraph is yours, which is the only way it can be handed in.</p>
  </div>`;
}

function tabs(){
  return `<div class="panel p-3 wr-tabwrap">
    <div class="seg wr-seg">
      <button data-wrtab="build" aria-pressed="${S.tab==='build'}">Shape a paragraph</button>
      <button data-wrtab="check" aria-pressed="${S.tab==='check'}">Check a paragraph</button>
    </div>
  </div>`;
}

/* ---- choosing a standard ----
   The same drill-down as the study guide \u2014 level, then faculty, then
   subject \u2014 so a student who has used that tab already knows this one.
   Only levels, faculties and subjects that actually have a writing standard
   are offered, so nothing leads to an empty list. */

function writingTree(){
  const out = {};
  for(const x of allWritingStandards()){
    const d = (window.NCEA_DATA || {})[x.level]; if(!d) continue;
    const fac = (d.faculties || []).find(f => (f.subjects || []).includes(x.subject))
             || { name:'Other', dark:'#475569', light:'#f1f5f9', subjects:[x.subject] };
    const L = out[x.level] = out[x.level] || {};
    const F = L[fac.name] = L[fac.name] || { fac, subjects:{} };
    (F.subjects[x.subject] = F.subjects[x.subject] || []).push(x);
  }
  return out;
}

const pill = (cls, attr, label, on, fac) =>
  `<button class="${cls}" ${attr} aria-pressed="${!!on}"${fac
    ? ` style="--fac-dark:${esc(fac.dark)};--fac-light:${esc(fac.light)}"` : ''}>${label}</button>`;

function stdBar(){
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  /* S.picking wins, so "Change" reopens the list without clearing what they
     already chose \u2014 Close puts them back where they were */
  if(cur && !S.picking) return `<div class="panel p-4 wr-stdbar">
    <div>
      <p class="wr-stdlab">Writing for</p>
      <p class="wr-stdname"><strong>AS${esc(cur.st.code)}</strong> ${esc(cur.st.title)}</p>
      <p class="wr-stdsub">${esc(LEVEL_NAME[cur.level])} ${esc(cur.subject)} \u00b7
        ${esc(cur.st.mode)}ly assessed \u00b7 ${esc(cur.st.format.split('.')[0])}.</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrclear>Change</button>
  </div>`;

  const all = allWritingStandards();
  if(!all.length && !cur){
    ensureLevels();
    return `<div class="panel p-4"><p class="wr-lead">${loadFailed
      ? `The list of standards could not load, so you cannot pick one here. Both tools still
         work without it \u2014 pick a paragraph shape below, or paste a paragraph into
         <strong>Check a paragraph</strong>.`
      : `Loading the standards\u2026 You do not have to wait. Pick a paragraph shape below
         and start writing.`}</p></div>`;
  }

  if(!S.picking) return `<div class="panel p-4 wr-stdbar">
    <div>
      <p class="wr-stdlab">No standard chosen</p>
      <p class="wr-stdsub">Both tools work without one. Picking your standard shows what it
        asks for and lets you send the paragraph straight to the feedback prompt.</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrpick>Choose a standard</button>
  </div>`;

  const tree = writingTree();
  const n = S.nav || (S.nav = {});
  /* a level with one faculty, or a faculty with one subject, chooses itself */
  const levels = Object.keys(tree).sort();
  if(n.level && !tree[n.level]) n.level = null;
  const facs = n.level ? tree[n.level] : null;
  if(n.faculty && (!facs || !facs[n.faculty])) n.faculty = null;
  const subs = n.faculty ? facs[n.faculty].subjects : null;
  if(n.subject && (!subs || !subs[n.subject])) n.subject = null;

  let html = `<div class="wr-stdbar">
    <div>
      <p class="wr-stdlab">Which standard are you writing for?</p>
      <p class="wr-stdsub">The ${all.length} standards assessed by extended writing.</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrunpick>Close</button>
  </div>
  <p class="wr-lvlh">Level</p>
  <div class="wr-pills">${levels.map(l =>
    pill('fac-pill', `data-wrnav="level|${esc(l)}"`, esc(LEVEL_NAME[l]), n.level === l)).join('')}</div>`;

  if(facs){
    const names = Object.keys(facs).sort();
    html += `<p class="wr-lvlh">Faculty</p>
      <div class="wr-pills">${names.map(f => pill('fac-pill',
        `data-wrnav="faculty|${esc(f)}"`,
        `${esc(f)} <span class="fac-count">${Object.values(facs[f].subjects)
          .reduce((a, b) => a + b.length, 0)}</span>`,
        n.faculty === f, facs[f].fac)).join('')}</div>`;
  }
  if(subs){
    const fac = facs[n.faculty].fac;
    html += `<p class="wr-lvlh">Subject</p>
      <div class="wr-pills">${Object.keys(subs).sort().map(sj => pill('subj-pill',
        `data-wrnav="subject|${esc(sj)}"`,
        `${esc(sj)} <span class="fac-count">${subs[sj].length}</span>`,
        n.subject === sj, fac)).join('')}</div>`;
  }
  if(n.subject){
    html += `<p class="wr-lvlh">Standard</p>
      <div class="wr-picks">${subs[n.subject]
        .sort((a, b) => String(a.st.ref || '').localeCompare(String(b.st.ref || '')))
        .map(x => `<button class="wr-pick" data-wrstd="${esc(x.level)}|${esc(x.st.code)}">
          <b>${esc(x.st.ref || x.st.code)}
            <span class="wr-mode wr-${esc(x.st.mode)}">${esc(x.st.mode)}</span></b>
          <span>${esc(x.st.title)}</span></button>`).join('')}</div>`;
  } else {
    html += `<p class="wr-hint">${n.faculty ? 'Pick a subject.'
      : n.level ? 'Pick a faculty.' : 'Start with your level.'}</p>`;
  }
  return `<div class="panel p-4">${html}</div>`;
}

/* ============================================================
   THE HABIT
   One paragraph at a time, this tool cannot see the thing it
   exists to change: a student who writes every paragraph the
   same way. So it keeps a tally of the shapes they have
   actually finished, and says so. Nothing here grades anything
   \u2014 it reports a pattern the student cannot see from inside
   a single paragraph.
   ============================================================ */

function recordUse(id){
  if(!id) return;
  S.used = S.used || {};
  S.used[id] = (S.used[id] || 0) + 1;
  S.recent = [id].concat(S.recent || []).slice(0, 8);
  save();
}

function habitNote(){
  const r = S.recent || [], used = S.used || {};
  const tried = Object.keys(used).length;
  const bodyShapes = SHAPES.filter(x => x.id && x.group !== 'Opening and closing');
  if(!r.length) return '';

  /* three in a row of the same shape is a habit, not a choice */
  const run = r.length >= 3 && r.slice(0, 3).every(x => x === r[0]) ? r[0] : null;
  const untried = bodyShapes.filter(x => !used[x.id]);
  if(run){
    const alt = untried.length ? untried : bodyShapes.filter(x => x.id !== run);
    return `<div class="wr-habit">
      <p class="wr-habith">Your last three paragraphs were all ${esc(shapeById(run).name)}.</p>
      <p class="wr-habitb">A piece of writing built from one shape reads flat however good the
      content is, and markers see it immediately. For the next one, try
      ${alt.slice(0, 2).map(x => `<strong>${esc(x.name)}</strong>`).join(' or ')}.</p>
    </div>`;
  }
  if(tried >= 2) return `<div class="wr-habit wr-habitok">
    <p class="wr-habith">You have used ${tried} different shapes so far.</p>
    <p class="wr-habitb">${untried.length
      ? `Still untried: ${untried.map(x => esc(x.name)).join(', ')}.`
      : 'You have tried every one of them.'}</p>
  </div>`;
  return '';
}

/* ============================================================
   FEEDBACK WHILE THEY WRITE
   Everything here is counted, not judged. It can tell a student
   that a sentence is 44 words long, or that it opens the same
   way as the one above it, because those are facts about the
   text. It cannot tell them whether the evidence proves the
   claim \u2014 that needs a reader who knows the subject, which is
   what the feedback prompt is for. The line between the two is
   the whole design, so nothing below ever looks at meaning.
   ============================================================ */

const HEDGES = /\b(very|really|quite|rather|somewhat|a bit|kind of|sort of|pretty much|basically|actually|simply|just|literally|obviously|clearly)\b/gi;
const VAGUE = [
  [/\bthere (is|are) evidence\b/i, 'name the evidence instead'],
  [/\bstudies show\b/i,            'which study?'],
  [/\b(many|some|most) people\b/i,  'which people, and how do you know?'],
  [/\bit is (well )?known\b/i,      'known by whom?'],
  [/\ba lot of\b/i,                'how much?'],
  [/\bthings?\b/i,                 'name the thing'],
  [/\bstuff\b/i,                   'name it']
];

/* one sentence, measured against the one before it */
function liveNote(text, prevOpener){
  const t = String(text || '').trim();
  if(!t) return null;
  const ss = sentences(t);
  if(!ss.length) return null;
  const words = wordCount(t);
  const op = opener(ss[0]);
  const flags = [];

  const gaps = blanksLeft(t);
  if(gaps) flags.push(`${gaps} gap${gaps===1?'':'s'} still to fill`);

  const longest = ss.reduce((m, x) => Math.max(m, wordCount(x)), 0);
  if(longest >= 35) flags.push(`${longest} words in one sentence \u2014 look for a break`);

  if(prevOpener && op === prevOpener && flags.length < 2)
    flags.push(`opens the same way as the one above`);

  if(flags.length < 2){
    const h = [...new Set((t.match(HEDGES) || []).map(x => x.toLowerCase()))];
    if(h.length >= 2) flags.push(`hedging: ${h.slice(0, 3).map(x => `\u201c${x}\u201d`).join(', ')}`);
  }

  if(flags.length < 2) for(const [re, why] of VAGUE)
    if(re.test(t)){ flags.push(`vague \u2014 ${why}`); break; }

  if(flags.length < 2 && ss.length > 2)
    flags.push(`${ss.length} sentences in one answer`);

  return { words, op, count: ss.length, flags: flags.slice(0, 2) };
}

function liveHTML(text, prevOpener){
  const a = liveNote(text, prevOpener);
  if(!a) return '';
  return `<p class="wr-live${a.flags.length ? ' wr-liveflag' : ''}">
    <span class="wr-livem">${a.words} word${a.words===1?'':'s'} \u00b7
      ${esc(OPENER_NAME[a.op] || a.op)}</span>
    ${a.flags.map(f => `<span class="wr-livef">${esc(f)}</span>`).join('')}
  </p>`;
}

/* the opener of the last filled answer before index i, so a student can see
   two sentences in a row built the same way */
function prevOpenerFor(a, steps, i){
  for(let k = i - 1; k >= 0; k--){
    const t = (a[k] || '').trim();
    if(t){ const ss = sentences(t); if(ss.length) return opener(ss[ss.length - 1]); }
  }
  return null;
}

/* ---- what the chosen standard asks for ----
   Until now the standard only labelled the page and scoped the feedback
   prompt. These two use it: the verbs in the standard decide which shapes
   are worth recommending, and the band shift is the thing the paragraph
   actually has to deliver. Both are read straight from the standard's own
   data \u2014 nothing here is invented. */

const VERB_SHAPES = [
  { re:/evaluat|justif|judge|assess|significan/i, ids:['build','counter'] },
  { re:/compar|contrast/i,                        ids:['compare'] },
  { re:/caus|consequen|process|effect|shape/i,    ids:['cause'] },
  { re:/analys|analyz|examin|explor|interpret/i,  ids:['angles','claim'] },
  { re:/discuss|argu|respond/i,                   ids:['counter','build'] },
  { re:/text|languag|quot|author|writer/i,        ids:['quote'] },
  { re:/explain|describ|demonstrat|understand/i,  ids:['claim','cause'] }
];

function suggestedShapes(){
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  if(!cur) return [];
  const hay = [(cur.st.verbs || []).join(' '), cur.st.title || ''].join(' ');
  const out = [];
  for(const v of VERB_SHAPES) if(v.re.test(hay)) for(const id of v.ids)
    if(!out.includes(id)) out.push(id);
  /* At Level 3 and Scholarship the judgement shapes are worth putting in
     front of everyone, because that is what the levels are marked on. */
  if(cur.level === '3' || cur.level === 'S')
    for(const id of ['build','counter']) if(!out.includes(id)) out.push(id);
  /* a shape they already lean on is not a recommendation, it is a rut */
  const used = S.used || {};
  const lean = Object.keys(used).filter(k => used[k] >= 3);
  let fresh = out.filter(id => !lean.includes(id));
  if(!fresh.length){
    /* every shape the verbs point at is one they already lean on, so the
       useful recommendation is the one they have never tried */
    fresh = SHAPES.filter(x => x.id && x.group !== 'Opening and closing' && !used[x.id])
                  .map(x => x.id);
  }
  return (fresh.length ? fresh : out).slice(0, 4);
}

function standardAsks(){
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  if(!cur) return '';
  const b = cur.st.bandShift || {}, pit = cur.st.pitfalls || [];
  if(!b.aToM && !b.mToE && !pit.length) return '';
  return `<div class="panel p-4 wr-asks">
    <h3 class="wr-h3">What ${esc(cur.st.ref || cur.st.code)} is actually marked on</h3>
    <p class="wr-hint">Straight from the standard. Your paragraph is one piece of this, not all of it.</p>
    ${b.aToM ? `<div class="wr-band"><p class="wr-bandh">Achieved \u2192 Merit</p>
      <p class="wr-bandb">${esc(b.aToM)}</p></div>` : ''}
    ${b.mToE ? `<div class="wr-band"><p class="wr-bandh">Merit \u2192 Excellence</p>
      <p class="wr-bandb">${esc(b.mToE)}</p></div>` : ''}
    ${pit.length ? `<p class="wr-rh">What loses marks in this standard</p>
      <ul class="wr-pits">${pit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

/* ---- build pane ---- */

function buildPane(){
  return stdBar() + standardAsks() +
    `<div class="wr-work"><div class="wr-main">${shapePicker()}${S.shape ? shapeForm() : ''}</div>` +
    ideasRail() + `</div>`;
}

function shapePicker(){
  /* Once they have chosen, nine tiles are just something to scroll past, so
     the picker folds to a line. Reopening is one click and nothing is lost. */
  if(S.shape && !S.shapeOpen){
    const sh = shapeById(S.shape);
    const h = habitNote();
    return `<div class="panel p-4 wr-stdbar wr-chosen">
      <div>
        <p class="wr-stdlab">Paragraph shape</p>
        <p class="wr-stdname"><strong>${esc(sh.name)}</strong>${sh.also
          ? ` <em>(${esc(sh.also)})</em>` : ''}</p>
        <p class="wr-stdsub">${esc(sh.use)}</p>
        ${/last three/.test(h) ? `<p class="wr-stdsub wr-runwarn">You have used this shape for
          your last three paragraphs \u2014 worth changing for the next one.</p>` : ''}
      </div>
      <button class="wr-btn wr-ghost" data-wrshapeopen>Change shape</button>
    </div>`;
  }

  /* one pass, so a group heading opens a row and the next one closes it */
  const rec = suggestedShapes();
  let html = '', open = false;
  for(const s of SHAPES){
    if(s.group){
      if(open) html += '</div>';
      html += `<p class="wr-grouph">${esc(s.group)}</p><div class="wr-shapes">`;
      open = true; continue;
    }
    const fits = rec.includes(s.id);
    const n = (S.used || {})[s.id] || 0;
    html += `<button class="wr-shape${fits ? ' wr-fits' : ''}" data-wrshape="${esc(s.id)}"
        aria-pressed="${S.shape===s.id}">
      <span class="wr-shapename">${esc(s.name)}${s.also
        ? ` <em>(${esc(s.also)})</em>` : ''}${fits
        ? ' <span class="wr-rec">fits this standard</span>' : ''}${n
        ? ` <span class="wr-tally" title="paragraphs you have built this way">\u00d7${n}</span>`
        : (Object.keys(S.used || {}).length
            ? ' <span class="wr-new">not tried</span>' : '')}</span>
      <span class="wr-shapeuse">${esc(s.use)}</span>
    </button>`;
  }
  if(open) html += '</div>';
  return `<div class="panel p-4 md:p-5">
    <div class="wr-stdbar">
      <h3 class="wr-h3">What shape does this paragraph need?</h3>
      ${S.shape ? '<button class="wr-btn wr-ghost" data-wrshapeclose>Close</button>' : ''}
    </div>
    ${habitNote()}
    ${rec.length ? `<p class="wr-hint">The ones marked <em>fits this standard</em> are picked
      from the verbs in the standard itself \u2014 they are a starting point, not a rule.</p>` : ''}
    ${html}
  </div>`;
}

function shapeForm(){
  const sh = shapeById(S.shape); if(!sh) return '';
  const a = S.answers[sh.id] || [];
  const steps = stepsFor(sh);
  const lvl = levelOf(), ex = lvl && LEVEL_EXPECT[lvl];
  const filled = steps.filter((_, i) => (a[i] || '').trim()).length;
  return `<div class="panel p-4 md:p-5 wr-form">
    <h3 class="wr-h3">${esc(sh.name)}</h3>
    <p class="wr-lead">${esc(sh.use)} <span class="wr-count">${filled} of ${steps.length} written</span></p>
    ${ex ? `<div class="wr-level">
      <p class="wr-levelh">At ${esc(LEVEL_NAME[lvl])}</p>
      <p class="wr-levelb">${esc(ex.line)}</p>
      <p class="wr-levels">${esc(ex.shape)}</p>
    </div>` : `<p class="wr-hint">Pick your standard above and these questions adjust to its
      level \u2014 Level 3 asks more of the same paragraph than Level 1 does.</p>`}
    ${steps.map((st, i) => `
      <div class="wr-step${st.deep ? ' wr-deep' : ''}">
        <label for="wr-s${i}"><span class="wr-num">${i+1}</span>${esc(st.q)}${st.deep
          ? ` <span class="wr-rec">${esc(LEVEL_NAME[lvl])}</span>` : ''}</label>
        <textarea id="wr-s${i}" class="wr-in" data-wrstep="${i}" rows="2"
          placeholder="Write this sentence yourself">${esc(a[i] || '')}</textarea>
        ${liveHTML(a[i], prevOpenerFor(a, steps, i))}
        ${st.hint ? `<p class="wr-hint">${esc(st.hint)}</p>` : ''}
      </div>`).join('')}
    <div class="wr-assembled">
      <p class="wr-alabel">Your paragraph so far${(() => {
        const b = blanksLeft(steps.map((_, i) => a[i] || '').join(' '));
        return b ? ` <span class="wr-count wr-blanks">${b} gap${b===1?'':'s'} still to fill</span>` : '';
      })()}</p>
      <p class="wr-para">${filled ? esc(steps.map((_, i) => (a[i]||'').trim())
        .filter(Boolean).join(' ')) : '<span class="wr-empty">Nothing written yet.</span>'}</p>
    </div>
    <div class="wr-acts">
      <button class="wr-btn wr-go" data-wrcheck>Check this paragraph</button>
      <button class="wr-btn wr-alt" data-wrcopy>Copy it</button>
      ${S.std ? `<button class="wr-btn wr-alt" data-wrfeedback>Get feedback on it</button>` : ''}
      <button class="wr-btn wr-ghost" data-wrreset>Clear</button>
    </div>
  </div>`;
}


/* ---- sentence ideas ----
   The shapes decide what each sentence has to DO. This decides how it could
   be built. It is offered beside the questions rather than after the fact,
   because that is when a student is actually choosing words — and the
   openers already used are ticked, so it reads as a menu of what is left
   rather than a list of instructions. */

function ideasRail(){
  const a = analyse(currentText());
  const used = k => !!a.openers[k];
  const openers = movesFor('opener');
  const inside  = movesFor('inside');
  const adv     = movesFor('advanced');
  const left = openers.filter(m => !used(m.key)).length;

  const row = m => {
    const done = m.cat === 'opener' && used(m.key);
    const open = S.idea === m.key;
    return `<div class="wr-idea${done ? ' wr-done' : ''}${open ? ' wr-ideaopen' : ''}">
      <button class="wr-ideab" data-wridea="${esc(m.key)}" aria-expanded="${open}">
        ${done ? '<span class="wr-tick" aria-hidden="true">\u2713</span>' : ''}${esc(m.label)}
        ${m.cat === 'advanced' ? '<span class="wr-adv">advanced</span>' : ''}
      </button>
      ${open ? `<div class="wr-ideabody">
        <p class="wr-ideawhy">${esc(m.why)}</p>
        <p class="wr-ideaeg">${esc(m.eg)}</p>
        <button class="wr-btn wr-alt wr-ideaadd" data-wraddframe="${esc(m.key)}">Add the frame</button>
        <p class="wr-ideaframe"><code>${esc(m.frame)}</code></p>
      </div>` : ''}
    </div>`;
  };

  return `<aside class="wr-rail"><div class="wr-railin">
    <p class="wr-railh">Sentence ideas${a.count
      ? ` <span class="wr-count">${left} of ${openers.length} not tried</span>` : ''}</p>
    <p class="wr-railsub">Click one to see when to use it. <strong>Add the frame</strong> drops its
      skeleton into the box you were last writing in \u2014 with the gaps left for you. It never
      puts a finished sentence anywhere.</p>
    <div class="wr-railscroll">
      <p class="wr-rh">Ways to open a sentence</p>
      ${openers.map(row).join('')}
      <p class="wr-rh">Ways to build one</p>
      ${inside.map(row).join('')}
      ${adv.length ? `<p class="wr-rh">Advanced</p>
        <p class="wr-advnote">Rhetorical constructions that reward Level 3 and Scholarship
          writing in this subject. One of these in a piece is control; three is strain.</p>
        ${adv.map(row).join('')}` : ''}
    </div>
  </div></aside>`;
}

/* Dropping a frame in is the one place this tool touches the student's text,
   so what it inserts is a skeleton with every slot still empty: "Although
   [what is true], ". The gaps are counted back to them until they are gone. */
function addFrame(key){
  const m = MOVES.find(x => x.key === key); if(!m || !S.shape) return;
  const sh = shapeById(S.shape); if(!sh) return;
  const a = S.answers[S.shape] = S.answers[S.shape] || [];
  const steps = stepsFor(sh);
  let i = S.lastStep;
  if(i == null || i < 0 || i >= steps.length)
    i = steps.findIndex((_, k) => !(a[k] || '').trim());
  if(i < 0) i = steps.length - 1;
  const cur = (a[i] || '');
  a[i] = cur && !/\s$/.test(cur) ? cur + ' ' + m.frame : cur + m.frame;
  S.lastStep = i; save(); render();
  const box = R() && R().querySelector(`[data-wrstep="${i}"]`);
  if(box && box.focus){ box.focus(); try{ box.setSelectionRange(box.value.length, box.value.length); }catch(e){} }
}

const blanksLeft = text => (String(text).match(/\[[^\]]+\]/g) || []).length;

/* ---- check pane ---- */

function checkPane(){
  const a = analyse(S.draft);
  return `<div class="panel p-4 md:p-5">
    <h3 class="wr-h3">Paste a paragraph</h3>
    <p class="wr-lead">One paragraph at a time. This counts what is there — it does not judge
    whether the content is any good, because it cannot see your standard, your task or your
    evidence.</p>
    <textarea id="wr-draft" class="wr-in wr-big" rows="7"
      placeholder="Paste or write a paragraph here">${esc(S.draft)}</textarea>
    ${a.count ? report(a) : `<p class="wr-hint mt-2">Nothing to read yet.</p>`}
  </div>`;
}

function report(a){
  const pct = k => a.count ? Math.round((a.openers[k] || 0) / a.count * 100) : 0;
  const used = Object.entries(a.openers).sort((x,y) => y[1] - x[1]);
  return `<div class="wr-report">
    <div class="wr-stats">
      <div class="wr-stat"><b>${a.count}</b><span>sentence${a.count===1?'':'s'}</span></div>
      <div class="wr-stat"><b>${a.words}</b><span>words</span></div>
      <div class="wr-stat"><b>${a.avg}</b><span>average length</span></div>
      <div class="wr-stat"><b>${a.shortest}–${a.longest}</b><span>shortest to longest</span></div>
    </div>

    <p class="wr-rh">How each sentence opens</p>
    <ul class="wr-openers">${used.map(([k,n]) =>
      `<li><span class="wr-obar" style="--pct:${pct(k)}%"></span>
        <span class="wr-oname">${esc(OPENER_NAME[k] || k)}</span>
        <span class="wr-on">${n}</span></li>`).join('')}</ul>

    ${(a.semicolons || a.dashes || a.colons) ? `<p class="wr-punct">Also using:
      ${[a.semicolons && `${a.semicolons} semicolon${a.semicolons===1?'':'s'}`,
         a.dashes && `${a.dashes} dash${a.dashes===1?'':'es'}`,
         a.colons && `${a.colons} colon${a.colons===1?'':'s'}`]
        .filter(Boolean).join(' · ')}.</p>` : ''}

    <p class="wr-rh">Sentence by sentence</p>
    <ol class="wr-slist">${a.sentences.map(s => `<li>
      <span class="wr-slen">${s.words}w</span>
      <span class="wr-sop">${esc(OPENER_NAME[s.opener] || s.opener)}</span>
      <span class="wr-stext">${esc(s.text.length > 90 ? s.text.slice(0,90) + '…' : s.text)}</span>
    </li>`).join('')}</ol>

    ${suggestions(a).map(s => s.moves
      ? `<div class="wr-moves"><p class="wr-rh">Constructions you have not used here</p>
          ${s.moves.map(m => `<div class="wr-move">
            <p class="wr-movename">${esc(m.label)}</p>
            <p class="wr-movewhy">${esc(m.why)}</p>
            <p class="wr-moveeg">${esc(m.eg)}</p></div>`).join('')}</div>`
      : `<div class="wr-sug"><p class="wr-sugh">${esc(s.head)}</p>
          <p class="wr-sugb">${s.body}</p></div>`).join('')}

    <div class="wr-acts">
      ${S.std ? `<button class="wr-btn wr-alt" data-wrfeedback>Get feedback on it</button>` : ''}
      <button class="wr-btn wr-ghost" data-wrcleardraft>Clear</button>
    </div>
  </div>`;
}

function foot(){
  return `<p class="wr-build">${W_BUILD} · the paragraph shapes are classical rhetoric,
    named here in NCEA's own terms</p>`;
}

/* ============================================================
   HANDOFF
   The study guide already has a mode that reads a whole piece
   against the standard and refuses to grade it. Rather than
   building a second one, send the paragraph there.
   ============================================================ */

function currentText(){
  if(S.tab === 'check') return (S.draft || '').trim();
  const sh = shapeById(S.shape); if(!sh) return '';
  const a = S.answers[sh.id] || [];
  return stepsFor(sh).map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
}

function feedbackPrompt(){
  const text = currentText();
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  const sh = shapeById(S.shape);
  let extra = 'This is ONE PARAGRAPH, not a whole piece of work. Comment on this paragraph only.';
  if(sh && S.tab === 'build')
    extra += ` I was trying to write it as "${sh.name}": ${sh.steps.map(s => s.q).join(' ')}`;
  extra += '\n\nMy paragraph:\n\n' + text;
  if(!cur || !window.composePrompt) return extra;
  return window.composePrompt({ level: cur.level, subject: cur.subject, code: cur.st.code,
    mode: 'feedback', topic: '__all__', context: '', extra });
}

function copy(text, btn, done){
  const ok = () => { if(!btn) return; const was = btn.textContent;
    btn.textContent = done || 'Copied'; setTimeout(() => { btn.textContent = was; }, 1400); };
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(text).then(ok, () => fallback(text, ok));
  else fallback(text, ok);
}
function fallback(text, ok){
  const t = document.createElement('textarea');
  t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
  document.body.appendChild(t); t.select();
  try{ document.execCommand('copy'); ok(); }
  catch(e){ alert('Copying failed — select the text and copy it by hand.'); }
  document.body.removeChild(t);
}

/* ============================================================
   EVENTS
   ============================================================ */

function wire(){
  const r = R(); if(!r || r.dataset.wrWired) return;
  r.dataset.wrWired = '1';

  r.addEventListener('click', ev => {
    const t = ev.target.closest('[data-wrtab],[data-wrstd],[data-wrclear],[data-wrshape],' +
      '[data-wrcheck],[data-wrcopy],[data-wrfeedback],[data-wrreset],[data-wrcleardraft],' +
      '[data-wrpick],[data-wrunpick],[data-wrnav],[data-wridea],[data-wraddframe],' +
      '[data-wrshapeopen],[data-wrshapeclose]');
    if(!t) return;
    const d = t.dataset;

    if('wrtab' in d){ S.tab = d.wrtab; save(); render(); return; }
    if('wrpick' in d){ S.picking = true; render(); return; }
    if('wrunpick' in d){ S.picking = false; render(); return; }
    if('wridea' in d){ S.idea = S.idea === d.wridea ? null : d.wridea; render(); return; }
    if('wraddframe' in d){ addFrame(d.wraddframe); return; }
    if('wrnav' in d){
      const [k, v] = d.wrnav.split('|');
      S.nav = S.nav || {};
      /* picking a level clears the faculty under it, and so on down */
      if(k === 'level'){ S.nav = { level: S.nav.level === v ? null : v }; }
      if(k === 'faculty'){ S.nav.faculty = S.nav.faculty === v ? null : v; S.nav.subject = null; }
      if(k === 'subject'){ S.nav.subject = S.nav.subject === v ? null : v; }
      render(); return;
    }
    if('wrstd' in d){ S.picking = false; const [level, code] = d.wrstd.split('|');
      S.std = { level, code }; save(); render(); return; }
    if('wrclear' in d){ S.picking = true; render(); return; }
    if('wrshape' in d){
      S.shape = S.shape === d.wrshape ? null : d.wrshape;
      S.shapeOpen = false;          // chosen, so fold the picker away
      save(); render(); return;
    }
    if('wrshapeopen' in d){ S.shapeOpen = true; render(); return; }
    if('wrshapeclose' in d){ S.shapeOpen = false; render(); return; }
    if('wrreset' in d){ if(S.shape) delete S.answers[S.shape]; save(); render(); return; }
    if('wrcleardraft' in d){ S.draft = ''; save(); render(); return; }
    if('wrcheck' in d){ recordUse(S.shape); S.draft = currentText(); S.tab = 'check';
      save(); render(); return; }
    if('wrcopy' in d){ copy(currentText(), t); return; }
    if('wrfeedback' in d){ copy(feedbackPrompt(), t, 'Copied — paste it into your AI'); return; }
  });

  /* The analyser reruns as they type, so only the report is redrawn —
     rebuilding the textarea would move the caret to the end. */
  r.addEventListener('input', ev => {
    const el = ev.target;
    if(el.id === 'wr-draft'){
      S.draft = el.value; save();
      const box = r.querySelector('.wr-report');
      const a = analyse(S.draft);
      if(a.count){
        if(box) box.outerHTML = report(a);
        else el.insertAdjacentHTML('afterend', report(a));
      } else if(box) box.outerHTML = '<p class="wr-hint mt-2">Nothing to read yet.</p>';
      return;
    }
    if(el.dataset && el.dataset.wrstep !== undefined && S.shape){
      const i = +el.dataset.wrstep;
      const a = S.answers[S.shape] = S.answers[S.shape] || [];
      a[i] = el.value; save();
      const sh = shapeById(S.shape);
      const steps = stepsFor(sh);
      const para = r.querySelector('.wr-para');
      const cnt  = r.querySelector('.wr-form > .wr-lead .wr-count');
      const done = steps.map((_, k) => (a[k] || '').trim()).filter(Boolean);
      if(para) para.innerHTML = done.length ? esc(done.join(' '))
        : '<span class="wr-empty">Nothing written yet.</span>';
      if(cnt) cnt.textContent = `${done.length} of ${steps.length} written`;
      /* the ticks in the ideas panel answer "what have I not tried yet",
         so they have to keep up with the sentences being typed */
      /* redraw the note under this box and the one after it \u2014 the next
         one compares its opener against this one */
      for(const k of [i, i + 1]){
        const box = r.querySelector(`[data-wrstep="${k}"]`);
        if(!box) continue;
        const html = liveHTML(a[k], prevOpenerFor(a, steps, k));
        const cur = box.nextElementSibling;
        const isNote = cur && cur.classList && cur.classList.contains('wr-live');
        if(html){ if(isNote) cur.outerHTML = html; else box.insertAdjacentHTML('afterend', html); }
        else if(isNote) cur.remove();
      }
      const rail = r.querySelector('.wr-rail');
      if(rail) rail.outerHTML = ideasRail();
      const lab = r.querySelector('.wr-alabel');
      if(lab){
        const b = blanksLeft(steps.map((_, k) => a[k] || '').join(' '));
        lab.innerHTML = 'Your paragraph so far' + (b
          ? ` <span class="wr-count wr-blanks">${b} gap${b===1?'':'s'} still to fill</span>` : '');
      }
    }
  });

  /* a frame goes into the box they were last in, so remember which that was */
  r.addEventListener('focusin', ev => {
    const el = ev.target;
    if(el.dataset && el.dataset.wrstep !== undefined) S.lastStep = +el.dataset.wrstep;
  });
}

/* ---------- entry point ---------- */

load();
window.Writing = {
  moves: MOVES, movesFor, liveNote, recordUse, habitNote, stepsFor, LEVEL_EXPECT, addFrame, blanksLeft, suggestedShapes,
  open: render,
  state: S,
  /* exposed so the tests can check the analyser without driving the UI */
  analyse, sentences, opener, suggestions,
  shapes: SHAPES.filter(s => s.id),
  isWriting, allWritingStandards,
  build: W_BUILD
};

})();
