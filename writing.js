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
let S = { std: null, shape: null, answers: {}, draft: '', tab: 'build', picking: false };

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({
    std: S.std, shape: S.shape, answers: S.answers, draft: S.draft, tab: S.tab })); }
  catch(e){ /* private browsing or a full quota — not worth interrupting them */ }
}
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(o){ S.std = o.std || null; S.shape = o.shape || null;
      S.answers = o.answers || {}; S.draft = o.draft || '';
      S.tab = o.tab === 'check' ? 'check' : 'build'; }
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
    use:'The workhorse. State your point, then prove it. Use this when you know what you think and need to show why.',
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
    steps:[
      { q:'What is the point?', hint:'One sentence.' },
      { q:'First angle, with its evidence', hint:'' },
      { q:'Second angle, from a different kind of evidence', hint:'Different in kind, not just another example of the same thing.' },
      { q:'What do they together establish that neither does alone?',
        hint:'If the answer is "the same thing twice", you need a different second angle.' }
    ]},

  { id:'compare', name:'Compare and weigh',
    use:'Two things side by side. The weighing at the end is what lifts it above a list.',
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
    steps:[
      { q:'First piece of evidence', hint:'Start with the least contentious.' },
      { q:'Second piece, from elsewhere', hint:'' },
      { q:'Third piece', hint:'' },
      { q:'What follows from all three that was not obvious at the start?',
        hint:'If your conclusion was already obvious after the first sentence, use Claim and proof instead.' }
    ]},

  { id:'counter', name:'The counter-argument',
    use:'Taking on the strongest objection. Nearly every Excellence criterion rewards this somewhere.',
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
    steps:[
      { q:'What has your evidence established?',
        hint:'What you have shown, not what you set out to show.' },
      { q:'So what is the answer to the question?',
        hint:'Answer it directly, in the question’s own terms.' },
      { q:'Why does it matter beyond this essay?',
        hint:'One sentence. Significance, not a new argument.' }
    ]}
];

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
const MOVES = [
  { key:'preposition', label:'Open one with a preposition',
    why:'Puts the time, place or condition first and gets you out of subject-verb-object.',
    eg:'By 1863, the Crown had already decided on invasion.' },
  { key:'participle-ing', label:'Open one with an -ing verb',
    why:'Links an action to the main clause without a connective.',
    eg:'Facing falling yields, the farmers changed their irrigation.' },
  { key:'participle-ed', label:'Open one with an -ed verb',
    why:'Describes the subject before you name it.',
    eg:'Weakened by erosion, the cliff face collapsed within a decade.' },
  { key:'subordinate', label:'Open one with While, Although or Because',
    why:'Shows the relationship between two ideas rather than stating them in sequence.',
    eg:'Although the data showed a rise, the sample was too small to be conclusive.' },
  { key:'adverb', label:'Open one with an adverb',
    why:'Sets the manner or degree up front.',
    eg:'Gradually, the sediment built up behind the groyne.' }
];

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
  const unused = MOVES.filter(m => !a.openers[m.key]);
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
    questions, the other counts what is there. Every word in your paragraph is yours, which is the
    only way it can be handed in.</p>
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

/* ---- standard chooser ---- */

function stdBar(){
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  if(cur) return `<div class="panel p-4 wr-stdbar">
    <div>
      <p class="wr-stdlab">Writing for</p>
      <p class="wr-stdname"><strong>AS${esc(cur.st.code)}</strong> ${esc(cur.st.title)}</p>
      <p class="wr-stdsub">${esc(LEVEL_NAME[cur.level])} ${esc(cur.subject)} ·
        ${esc(cur.st.mode)}ly assessed · ${esc(cur.st.format.split('.')[0])}.</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrclear>Change</button>
  </div>`;

  const all = allWritingStandards();
  if(!all.length){
    ensureLevels();
    return `<div class="panel p-4"><p class="wr-lead">${loadFailed
      ? `The list of standards could not load, so you cannot pick one here. Both tools still
         work without it \u2014 pick a paragraph shape below, or paste a paragraph into
         <strong>Check a paragraph</strong>.`
      : `Loading the list of writing standards\u2026 You do not have to wait for it. Pick a
         paragraph shape below and start writing.`}</p></div>`;
  }

  /* Eighty chips is a wall, and the tools below it are the point of the tab,
     so the list stays shut until someone asks for it. Students who came from
     the study guide never see it at all \u2014 their standard is already set. */
  if(!S.picking) return `<div class="panel p-4 wr-stdbar">
    <div>
      <p class="wr-stdlab">No standard chosen</p>
      <p class="wr-stdsub">Both tools work without one. Picking your standard shows what it
        asks for and lets you send the paragraph straight to the feedback prompt.</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrpick>Choose a standard</button>
  </div>`;

  const byLevel = {};
  for(const x of all){ (byLevel[x.level] = byLevel[x.level] || []).push(x); }
  return `<div class="panel p-4">
    <div class="wr-stdbar">
      <div>
        <p class="wr-stdlab">Which standard are you writing for?</p>
        <p class="wr-stdsub">The ${all.length} standards assessed by extended writing.</p>
      </div>
      <button class="wr-btn wr-ghost" data-wrunpick>Close</button>
    </div>
    <div class="wr-pickwrap">
      ${Object.keys(byLevel).sort().map(lvl => `
        <div class="wr-lvlgroup">
          <p class="wr-lvlh">${esc(LEVEL_NAME[lvl])}</p>
          <div class="wr-picks">${byLevel[lvl]
            .sort((a,b) => a.subject.localeCompare(b.subject) ||
                           String(a.st.ref||'').localeCompare(String(b.st.ref||'')))
            .map(x => `<button class="wr-pick" data-wrstd="${esc(lvl)}|${esc(x.st.code)}">
              <b>${esc(x.subject)} ${esc(x.st.ref || x.st.code)}</b>
              <span>${esc(x.st.title)}</span></button>`).join('')}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

/* ---- build pane ---- */

function buildPane(){
  return stdBar() + shapePicker() + (S.shape ? shapeForm() : '');
}

function shapePicker(){
  /* one pass, so a group heading opens a row and the next one closes it */
  let html = '', open = false;
  for(const s of SHAPES){
    if(s.group){
      if(open) html += '</div>';
      html += `<p class="wr-grouph">${esc(s.group)}</p><div class="wr-shapes">`;
      open = true; continue;
    }
    html += `<button class="wr-shape" data-wrshape="${esc(s.id)}"
        aria-pressed="${S.shape===s.id}">
      <span class="wr-shapename">${esc(s.name)}${s.also
        ? ` <em>(${esc(s.also)})</em>` : ''}</span>
      <span class="wr-shapeuse">${esc(s.use)}</span>
    </button>`;
  }
  if(open) html += '</div>';
  return `<div class="panel p-4 md:p-5">
    <h3 class="wr-h3">What shape does this paragraph need?</h3>
    ${html}
  </div>`;
}

function shapeForm(){
  const sh = shapeById(S.shape); if(!sh) return '';
  const a = S.answers[sh.id] || [];
  const filled = sh.steps.filter((_, i) => (a[i] || '').trim()).length;
  return `<div class="panel p-4 md:p-5 wr-form">
    <h3 class="wr-h3">${esc(sh.name)}</h3>
    <p class="wr-lead">${esc(sh.use)} <span class="wr-count">${filled} of ${sh.steps.length} written</span></p>
    ${sh.steps.map((st, i) => `
      <div class="wr-step">
        <label for="wr-s${i}"><span class="wr-num">${i+1}</span>${esc(st.q)}</label>
        <textarea id="wr-s${i}" class="wr-in" data-wrstep="${i}" rows="2"
          placeholder="Write this sentence yourself">${esc(a[i] || '')}</textarea>
        ${st.hint ? `<p class="wr-hint">${esc(st.hint)}</p>` : ''}
      </div>`).join('')}
    <div class="wr-assembled">
      <p class="wr-alabel">Your paragraph so far</p>
      <p class="wr-para">${filled ? esc(sh.steps.map((_, i) => (a[i]||'').trim())
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
  return sh.steps.map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
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
      '[data-wrpick],[data-wrunpick]');
    if(!t) return;
    const d = t.dataset;

    if('wrtab' in d){ S.tab = d.wrtab; save(); render(); return; }
    if('wrpick' in d){ S.picking = true; render(); return; }
    if('wrunpick' in d){ S.picking = false; render(); return; }
    if('wrstd' in d){ S.picking = false; const [level, code] = d.wrstd.split('|');
      S.std = { level, code }; save(); render(); return; }
    if('wrclear' in d){ S.std = null; S.picking = true; save(); render(); return; }
    if('wrshape' in d){ S.shape = S.shape === d.wrshape ? null : d.wrshape; save(); render(); return; }
    if('wrreset' in d){ if(S.shape) delete S.answers[S.shape]; save(); render(); return; }
    if('wrcleardraft' in d){ S.draft = ''; save(); render(); return; }
    if('wrcheck' in d){ S.draft = currentText(); S.tab = 'check'; save(); render(); return; }
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
      const para = r.querySelector('.wr-para');
      const cnt  = r.querySelector('.wr-count');
      const done = sh.steps.map((_, k) => (a[k] || '').trim()).filter(Boolean);
      if(para) para.innerHTML = done.length ? esc(done.join(' '))
        : '<span class="wr-empty">Nothing written yet.</span>';
      if(cnt) cnt.textContent = `${done.length} of ${sh.steps.length} written`;
    }
  });
}

/* ---------- entry point ---------- */

load();
window.Writing = {
  open: render,
  state: S,
  /* exposed so the tests can check the analyser without driving the UI */
  analyse, sentences, opener, suggestions,
  shapes: SHAPES.filter(s => s.id),
  isWriting, allWritingStandards,
  build: W_BUILD
};

})();
