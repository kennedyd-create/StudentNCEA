/* ============================================================
   REFERENCE LIST BUILDER  (APA 7)

   Deliberately NOT a prompt generator. Everything here is a form
   and a formatter: the student types what is on the source in
   front of them, and the code arranges it. Nothing is fetched and
   nothing is guessed, because the one failure that matters in a
   bibliography is a reference to something that does not exist,
   and an AI asked to "find sources" will produce five of those
   without blinking.

   The one AI touch is at the very bottom: a prompt that CHECKS a
   list the student has already built. It can never add to it.
   ============================================================ */
(function () {

const BIB_BUILD = 'build 97 — writing tools';

const R = () => document.getElementById('bib-root');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- state ---------- */

const KEY = 'whs_bib_v1';
let S = { projects: [], active: null, draft: null, editing: null, showNotes: true };

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({
    projects: S.projects, active: S.active, showNotes: S.showNotes })); }
  catch(e){ /* private browsing, a full quota — not worth interrupting them for */ }
}
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(o && Array.isArray(o.projects)){
      S.projects = o.projects.map(p => ({
        id: p.id || uid(), name: p.name || 'Untitled', entries: Array.isArray(p.entries) ? p.entries : []
      }));
      S.active = o.active && S.projects.some(p => p.id === o.active) ? o.active : (S.projects[0]||{}).id || null;
      S.showNotes = o.showNotes !== false;
    }
  }catch(e){ /* corrupt store: start clean rather than die */ }
}
const uid = () => 'b' + Math.random().toString(36).slice(2,9);
const proj = () => S.projects.find(p => p.id === S.active) || null;

/* ============================================================
   APA 7 FORMATTING
   A reference is built as segments so the same data can go to the
   screen (with <em>), to the clipboard, and to the printer.
   ============================================================ */

const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

const T  = s => ({ t:'text', s });
const EM = s => ({ t:'em',   s });

/* "Jane Mary Smith" -> "J. M."   "Jean-Paul" -> "J.-P." */
function initials(given){
  return given.trim().split(/\s+/).filter(Boolean)
    .map(part => part.split('-').filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + '.').join('-'))
    .join(' ');
}

/* Author position: "Smith, J. M."  Organisations stay verbatim. */
function surnameFirst(raw, isOrg){
  const s = (raw||'').trim().replace(/\s+/g,' ');
  if(!s) return '';
  if(isOrg) return s;
  if(s.includes(',')){
    const i = s.indexOf(',');
    const sur = s.slice(0,i).trim(), given = s.slice(i+1).trim();
    return given ? `${sur}, ${initials(given)}` : sur;
  }
  const bits = s.split(' ');
  if(bits.length === 1) return s;
  const sur = bits.pop();
  return `${sur}, ${initials(bits.join(' '))}`;
}

/* Editor position inside a chapter reference runs the other way
   round: "J. M. Smith", initials first. APA 7, 10.3. */
function givenFirst(raw){
  const s = (raw||'').trim().replace(/\s+/g,' ');
  if(!s) return '';
  if(s.includes(',')){
    const i = s.indexOf(',');
    const sur = s.slice(0,i).trim(), given = s.slice(i+1).trim();
    return given ? `${initials(given)} ${sur}` : sur;
  }
  const bits = s.split(' ');
  if(bits.length === 1) return s;
  const sur = bits.pop();
  return `${initials(bits.join(' '))} ${sur}`;
}

const lines = v => String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);

/* 1 -> A.  2 -> A, & B.  3-20 -> A, B, & C.  21+ -> 19, ... last. */
function joinAuthors(list){
  const a = list.filter(Boolean);
  if(!a.length) return '';
  if(a.length === 1) return a[0];
  if(a.length === 2) return `${a[0]}, & ${a[1]}`;
  if(a.length <= 20) return a.slice(0,-1).join(', ') + ', & ' + a[a.length-1];
  return a.slice(0,19).join(', ') + ', ... ' + a[a.length-1];
}
function joinEditors(list){
  const a = list.filter(Boolean);
  if(!a.length) return '';
  if(a.length === 1) return a[0];
  if(a.length === 2) return `${a[0]} & ${a[1]}`;
  return a.slice(0,-1).join(', ') + ', & ' + a[a.length-1];
}

function authorsOf(e){ return joinAuthors(lines(e.authors).map(x => surnameFirst(x, e.org))); }

/* The author element closes with a full stop of its own. "Smith, J." already
   has one from the initial; "Auckland Council" does not, and APA still needs
   it: "Auckland Council. (2022)." */
const authorStop = A => A ? (/\.$/.test(A) ? A : A + '.') : '';

/* (2024, March 15) when a full date is given, (2024) when only a year,
   (n.d.) when there is neither — which APA requires rather than silence. */
function dateOf(e){
  if(e.fulldate && /^\d{4}-\d{2}-\d{2}$/.test(e.fulldate)){
    const [y,m,d] = e.fulldate.split('-').map(Number);
    if(m>=1 && m<=12) return `${y}, ${MONTHS[m-1]} ${d}`;
  }
  const y = (e.year||'').trim();
  return y || 'n.d.';
}

const hasUrl = e => !!(e.url||'').trim() || !!(e.doi||'').trim();
function urlSeg(e){
  const doi = (e.doi||'').trim();
  if(doi) return /^https?:/i.test(doi) ? doi : 'https://doi.org/' + doi.replace(/^doi:\s*/i,'');
  return (e.url||'').trim();
}
/* APA 7: an edition is "(2nd ed.)" — tolerate them typing either half of that. */
function editionSeg(e){
  let ed = (e.edition||'').trim();
  if(!ed) return '';
  ed = ed.replace(/\s*\bed(ition)?\.?\s*$/i,'').trim();
  return ed ? ` (${ed} ed.)` : '';
}
const pagesSeg = v => {
  const p = String(v||'').trim().replace(/\s*(-|--|–)\s*/g,'–');
  return p;
};
/* No full stop after a URL or DOI — APA 7, 9.35. Otherwise the reference
   closes with exactly one, which means trimming the trailing space off the
   last segment before deciding whether it already has it. */
function endStop(segs, e){
  if(hasUrl(e)) return segs;
  const last = segs[segs.length-1];
  if(last){
    last.s = last.s.replace(/\s+$/,'');
    if(last.s && !/[.!?]$/.test(last.s)) last.s += '.';
  }
  return segs;
}

function format(e){
  const A = authorsOf(e), D = dateOf(e), out = [];
  const title = (e.title||'').trim();
  /* empty segments are dropped, so the live preview stays readable while
     a half-filled form is still being typed into */
  const push = (...xs) => xs.forEach(x => x && x.s && out.push(x));

  switch(e.type){

    case 'book': {
      if(A) push(T(`${authorStop(A)} (${D}). `)); else push(T(`(${D}). `));
      push(EM(title), T(editionSeg(e)), T('. '));
      if((e.publisher||'').trim()) push(T((e.publisher||'').trim() + '. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    case 'chapter': {
      const eds = lines(e.editors).map(givenFirst);
      if(A) push(T(`${authorStop(A)} (${D}). `)); else push(T(`(${D}). `));
      push(T(title + '. '));
      if(eds.length) push(T(`In ${joinEditors(eds)} (${eds.length>1?'Eds.':'Ed.'}), `));
      else push(T('In '));
      push(EM((e.booktitle||'').trim()));
      if(pagesSeg(e.pages)) push(T(` (pp. ${pagesSeg(e.pages)})`));
      push(T('. '));
      if((e.publisher||'').trim()) push(T((e.publisher||'').trim() + '. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    case 'journal': {
      if(A) push(T(`${authorStop(A)} (${D}). `)); else push(T(`(${D}). `));
      push(T(title + '. '), EM((e.journal||'').trim()));
      const vol = (e.volume||'').trim(), iss = (e.issue||'').trim(), pg = pagesSeg(e.pages);
      if(vol){ push(T(', '), EM(vol)); if(iss) push(T(`(${iss})`)); }
      if(pg) push(T(', ' + pg));
      push(T('. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    /* With no byline the site becomes the author and is not said twice. */
    case 'web': {
      const site = (e.site||'').trim();
      if(A){
        push(T(`${authorStop(A)} (${D}). `), EM(title), T('. '));
        if(site) push(T(site + '. '));
      } else {
        push(T(`${site || 'Unknown site'}. (${D}). `), EM(title), T('. '));
      }
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    /* A news headline is not italicised; the publication is. With no
       byline the headline moves into the author position. */
    case 'news': {
      const paper = (e.paper||'').trim();
      if(A){
        push(T(`${authorStop(A)} (${D}). ${title}. `));
        if(paper) push(EM(paper), T('. '));
      } else {
        push(T(`${title}. (${D}). `));
        if(paper) push(EM(paper), T('. '));
      }
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    case 'video': {
      const site = (e.site||'').trim() || 'YouTube';
      if(A) push(T(`${authorStop(A)} (${D}). `)); else push(T(`(${D}). `));
      push(EM(title), T(' [Video]. '), T(site + '. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    case 'film': {
      const medium = (e.medium||'').trim() || 'Film';
      if(A) push(T(`${authorStop(A)} (Director). (${D}). `)); else push(T(`(${D}). `));
      push(EM(title), T(` [${medium}]. `));
      if((e.studio||'').trim()) push(T((e.studio||'').trim() + '. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    case 'report': {
      const pub = (e.publisher||'').trim(), no = (e.reportno||'').trim();
      if(A) push(T(`${authorStop(A)} (${D}). `)); else push(T(`(${D}). `));
      push(EM(title));
      if(no) push(T(` (${/^(No\.|Report)/i.test(no) ? no : 'No. ' + no})`));
      push(T('. '));
      /* APA 7: when the publisher is the author, it is not repeated. */
      if(pub && pub.toLowerCase() !== lines(e.authors).join(' ').toLowerCase().trim())
        push(T(pub + '. '));
      if(hasUrl(e)) push(T(urlSeg(e)));
      break;
    }

    /* Personal communications are cited in the text only — APA 7, 8.9 —
       so this produces the in-text form and says so loudly in the UI. */
    case 'interview': {
      const who = joinEditors(lines(e.authors).map(x => e.org ? x.trim() : givenFirst(x)));
      let when = '';
      if(e.fulldate && /^\d{4}-\d{2}-\d{2}$/.test(e.fulldate)){
        const [y,m,d] = e.fulldate.split('-').map(Number);
        if(m>=1 && m<=12) when = `${MONTHS[m-1]} ${d}, ${y}`;
      } else if((e.year||'').trim()) when = (e.year||'').trim();
      push(T(`(${who || 'Name'}, personal communication${when ? ', ' + when : ''})`));
      return out;                        // no closing stop: it sits inside a sentence
    }

    default:
      push(T(title || '(no details yet)'));
  }
  return endStop(out, e);
}

const plain = segs => segs.map(s => s.s).join('').replace(/\s+/g,' ').trim();
const html  = segs => segs.map(s => s.t === 'em'
  ? `<em>${esc(s.s)}</em>` : esc(s.s)).join('');

/* In-text citation. Three or more authors collapse to "et al." in APA 7
   from the very first citation. */
function inText(e){
  const names = lines(e.authors);
  let who;
  if(!names.length){
    who = e.type === 'web'   ? (e.site||'').trim()
        : e.type === 'news'  ? (e.title||'').trim()
        : (e.title||'').trim();
    if(e.type !== 'web' && who) who = '"' + who + '"';
  } else if(e.org || names.length === 1){
    who = e.org ? names[0].trim() : surnameFirst(names[0]).split(',')[0];
  } else if(names.length === 2){
    who = surnameFirst(names[0]).split(',')[0] + ' & ' + surnameFirst(names[1]).split(',')[0];
  } else {
    who = surnameFirst(names[0]).split(',')[0] + ' et al.';
  }
  const yr = (e.year||'').trim() ||
    ((e.fulldate||'').match(/^(\d{4})/) || [])[1] || 'n.d.';
  if(e.type === 'interview') return plain(format(e));
  return `(${who || 'Author'}, ${yr})`;
}

/* APA orders the list by whatever the reference opens with. */
function sortKey(e){
  const first = plain(format(e)).toLowerCase();
  return first.replace(/^["'(]*/,'').replace(/^(a|an|the)\s+/,'');
}
const sorted = p => (p ? p.entries.slice() : [])
  .sort((a,b) => sortKey(a).localeCompare(sortKey(b), 'en'));

/* ============================================================
   WHAT EACH SOURCE TYPE ASKS FOR
   ============================================================ */

const F = {
  authors:   { label:'Author(s)', area:true, req:true,
               hint:'One per line. Type them however they appear — “Jane Smith” or “Smith, Jane” both work. Leave blank if the page really has no author.' },
  org:       { label:'The author is an organisation', check:true,
               hint:'Tick for a council, ministry, NIWA, a company — the name then stays whole instead of being turned into initials.' },
  year:      { label:'Year', short:true, req:true, hint:'Just the year. Leave blank only if there truly is no date anywhere.' },
  fulldate:  { label:'Full date (if the source shows one)', date:true,
               hint:'Web pages, news and video need the day and month too. Look for it under the headline or at the foot of the page.' },
  title:     { label:'Title', req:true,
               hint:'APA uses sentence case: only the first word, proper nouns, and the first word after a colon take a capital.' },
  site:      { label:'Website name',  hint:'The name of the site, not its address. “Stats NZ”, not “stats.govt.nz”.' },
  paper:     { label:'Newspaper or masthead', hint:'The New Zealand Herald, RNZ, Gisborne Herald…' },
  publisher: { label:'Publisher' },
  edition:   { label:'Edition', short:true, hint:'Only if it is not the first. Type “2nd” or “3rd”.' },
  editors:   { label:'Editor(s) of the book', area:true,
               hint:'One per line. The editors of the whole book, not the author of your chapter.' },
  booktitle: { label:'Title of the whole book', req:true },
  pages:     { label:'Page range', short:true, hint:'e.g. 112–130' },
  journal:   { label:'Journal name', req:true },
  volume:    { label:'Volume', short:true },
  issue:     { label:'Issue', short:true },
  doi:       { label:'DOI', hint:'Preferred over a URL when the article has one. Paste the number or the whole doi.org link.' },
  medium:    { label:'Medium', short:true, hint:'Film, Documentary, TV series episode…' },
  studio:    { label:'Studio or distributor' },
  reportno:  { label:'Report number', short:true },
  url:       { label:'Web address (URL)',
               hint:'Paste the address of the exact page you used, not the site’s front page.' },
  role:      { label:'Who they are', hint:'Their role, for your own notes — “Auckland Council coastal scientist”.' }
};

const TYPES = {
  web:     { label:'Web page',        icon:'🌐',
             fields:['authors','org','fulldate','year','title','site','url'] },
  news:    { label:'News article',    icon:'📰',
             fields:['authors','org','fulldate','year','title','paper','url'] },
  book:    { label:'Book',            icon:'📕',
             fields:['authors','org','year','title','edition','publisher','url'] },
  chapter: { label:'Chapter in a book', icon:'📑',
             fields:['authors','org','year','title','editors','booktitle','pages','publisher'] },
  journal: { label:'Journal article', icon:'🔬',
             fields:['authors','org','year','title','journal','volume','issue','pages','doi'] },
  video:   { label:'Video',           icon:'▶️',
             fields:['authors','org','fulldate','year','title','site','url'] },
  film:    { label:'Film or documentary', icon:'🎬',
             fields:['authors','year','title','medium','studio','url'] },
  report:  { label:'Report or document', icon:'📊',
             fields:['authors','org','year','title','reportno','publisher','url'] },
  interview:{ label:'Interview',      icon:'🎤',
             fields:['authors','org','fulldate','year','role'] }
};

const TYPE_NOTE = {
  web:'If the page has no named author, leave Author blank — the site’s name takes its place.',
  news:'The headline is not italicised; the masthead is. A story with no byline moves the headline to the front.',
  chapter:'Use this when different authors wrote different chapters. If one author wrote the whole book, use Book.',
  journal:'Use the DOI if there is one. It is more stable than a URL and will still work in ten years.',
  video:'The channel or person who posted it is the author, even if someone else appears in it.',
  report:'Council plans, ministry documents, NIWA reports, company annual reports. Usually an organisation is the author.',
  interview:'An interview you did yourself is a <strong>personal communication</strong>. APA cites these in the text only — they do <strong>not</strong> go in the reference list. The in-text form is built for you below.'
};

/* Things worth saying about an entry once it exists. */
function flags(e){
  const out = [];
  const noDate = !(e.year||'').trim() && !(e.fulldate||'').trim();
  if(noDate) out.push('No date, so this shows as <strong>n.d.</strong> Check again before you accept that — look under the headline, at the foot of the page, or in the page’s “last updated” line.');
  if(!lines(e.authors).length && e.type !== 'web' && e.type !== 'news')
    out.push('No author. For this kind of source that is unusual — check the front matter or the end of the document.');
  if(e.type === 'interview')
    out.push('Personal communications are cited <strong>in the text only</strong>. Do not put this in your reference list.');
  if(/wikipedia\.org/i.test(e.url||''))
    out.push('Wikipedia is a starting point, not a source. Follow its references to the original and cite that instead — and check your teacher accepts it at all.');
  if((e.type==='web'||e.type==='news'||e.type==='video') && !(e.url||'').trim())
    out.push('No web address. Without it nobody can check this source.');
  if(e.type === 'journal' && !(e.doi||'').trim())
    out.push('No DOI. Most journal articles have one on the first page — it is worth finding.');
  if(!(e.used||'').trim())
    out.push('You have not said what you used this for. That note is what lets you put the right citation in the right paragraph later.');
  return out;
}

/* ============================================================
   RENDER
   ============================================================ */

function render(){
  const r = R(); if(!r) return;
  const p = proj();
  r.innerHTML = head() + (S.projects.length ? body(p) : empty()) + foot();
  wire();
}

function head(){
  return `<div class="panel p-5">
    <h2 class="bib-h">Bibliography maker</h2>
    <p class="bib-lead">Type in what is on the source in front of you and this arranges it in
    <strong>APA 7</strong> — the style Waiheke uses. It sorts the list, handles the italics and
    the full stops, and gives you the in-text citation to drop into your writing. In APA the
    finished list is headed <em>References</em> rather than “Bibliography”, so that is what gets
    printed.</p>
    <p class="bib-warn"><strong>It will not find sources for you, and you should not ask an AI to.</strong>
    Asked for sources, AI invents them: real-looking authors, real-looking titles, nothing behind them.
    Marked as your research, that is a breach. Everything in this tool comes from what you type,
    which means every reference in your list is one you actually read.</p>
  </div>`;
}

function empty(){
  return `<div class="panel p-5 bib-empty">
    <p class="bib-emptyh">Start with the assignment.</p>
    <p class="bib-lead">One list per piece of work — “Geography 3.3 research”, “History research”,
    “Media Studies study of a genre”. Keep them apart and you can hand in the right list without
    unpicking it later.</p>
    <div class="bib-newrow">
      <input id="bib-newname" class="bib-in" placeholder="Name of the assignment" maxlength="80">
      <button class="bib-btn bib-go" data-bibnew>Start this list</button>
    </div>
    <p class="bib-note">Saved in this browser, on this device. Print or copy it out when it matters.</p>
  </div>`;
}

function body(p){
  return `<div class="panel p-5 bib-projbar">
      <div class="bib-tabs">
        ${S.projects.map(x => `<button class="bib-ptab" data-bibp="${x.id}"
          aria-pressed="${x.id===S.active}">${esc(x.name)}
          <span class="bib-count">${x.entries.length}</span></button>`).join('')}
        <button class="bib-ptab bib-padd" data-bibaddp title="Start another list">+ New list</button>
      </div>
      ${p ? `<div class="bib-projacts">
        <button class="bib-btn bib-ghost" data-bibrename>Rename</button>
        <button class="bib-btn bib-ghost bib-danger" data-bibdelp>Delete list</button>
      </div>` : ''}
    </div>
    ${p ? adder() + list(p) + actions(p) + checker(p) : ''}`;
}

function adder(){
  const d = S.draft;
  if(!d) return `<div class="panel p-5">
    <h3 class="bib-h3">Add a source</h3>
    <p class="bib-lead">What kind of thing is it?</p>
    <div class="bib-types">
      ${Object.entries(TYPES).map(([k,v]) =>
        `<button class="bib-type" data-bibtype="${k}"><span>${v.icon}</span>${v.label}</button>`).join('')}
    </div>
  </div>`;

  const t = TYPES[d.type];
  return `<div class="panel p-5 bib-form">
    <h3 class="bib-h3">${t.icon} ${S.editing ? 'Edit this' : 'New'} ${t.label.toLowerCase()}</h3>
    ${TYPE_NOTE[d.type] ? `<p class="bib-tnote">${TYPE_NOTE[d.type]}</p>` : ''}
    <div class="bib-grid">
      ${t.fields.map(f => field(f, d)).join('')}
      <div class="bib-field bib-wide">
        <label for="bib-f-used">What did you use this for?</label>
        <textarea id="bib-f-used" class="bib-in bib-area" data-bibf="used"
          placeholder="e.g. the 1987 erosion figures, and the quote about the seawall"
          rows="2">${esc(d.used||'')}</textarea>
        <p class="bib-hint">The one field no other citation tool has, and the one that saves you.
        Come writing-up time this is how you know which paragraph needs which citation.</p>
      </div>
    </div>
    <div class="bib-preview">
      <p class="bib-plabel">As it will appear</p>
      <p class="bib-ref">${html(format(d))}</p>
      <p class="bib-intext">In your writing: <code>${esc(inText(d))}</code></p>
    </div>
    <div class="bib-formacts">
      <button class="bib-btn bib-go" data-bibsave>${S.editing ? 'Save changes' : 'Add to the list'}</button>
      <button class="bib-btn bib-ghost" data-bibcancel>Cancel</button>
    </div>
  </div>`;
}

function field(name, d){
  const f = F[name]; if(!f) return '';
  if(f.check) return `<div class="bib-field bib-wide bib-checkrow">
      <label><input type="checkbox" data-bibf="${name}" ${d[name]?'checked':''}> ${f.label}</label>
      ${f.hint ? `<p class="bib-hint">${f.hint}</p>` : ''}
    </div>`;
  const id = 'bib-f-' + name;
  const cls = 'bib-field' + (f.area ? ' bib-wide' : f.short ? ' bib-short' : '');
  const inner = f.area
    ? `<textarea id="${id}" class="bib-in bib-area" data-bibf="${name}" rows="2">${esc(d[name]||'')}</textarea>`
    : `<input id="${id}" class="bib-in" data-bibf="${name}" type="${f.date?'date':'text'}"
         value="${esc(d[name]||'')}">`;
  return `<div class="${cls}">
    <label for="${id}">${f.label}${f.req?' <span class="bib-req">needed</span>':''}</label>
    ${inner}
    ${f.hint ? `<p class="bib-hint">${f.hint}</p>` : ''}
  </div>`;
}

function list(p){
  const refs = sorted(p);
  const cites = refs.filter(e => e.type !== 'interview');
  const comms = refs.filter(e => e.type === 'interview');
  if(!refs.length) return `<div class="panel p-5"><p class="bib-lead">
    Nothing in this list yet. Add the first source above.</p></div>`;

  const row = e => {
    const fl = flags(e);
    return `<li class="bib-item">
      <div class="bib-itemmain">
        <p class="bib-ref">${html(format(e))}</p>
        ${S.showNotes && (e.used||'').trim()
          ? `<p class="bib-used"><strong>Used for:</strong> ${esc(e.used)}</p>` : ''}
        ${e.type !== 'interview'
          ? `<p class="bib-intext">In your writing: <code>${esc(inText(e))}</code></p>` : ''}
        ${fl.length ? `<ul class="bib-flags">${fl.map(x=>`<li>${x}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="bib-itemacts">
        <button class="bib-mini" data-bibedit="${e.id}">Edit</button>
        <button class="bib-mini bib-danger" data-bibdel="${e.id}">Delete</button>
      </div>
    </li>`;
  };

  return `<div class="panel p-5">
    <div class="bib-listhead">
      <h3 class="bib-h3">References <span class="bib-count">${cites.length}</span></h3>
      <label class="bib-toggle"><input type="checkbox" data-bibnotes ${S.showNotes?'checked':''}>
        Show my “used for” notes</label>
    </div>
    <p class="bib-lead">Alphabetical, the way APA wants it. You do not reorder this yourself.</p>
    <ol class="bib-list">${cites.map(row).join('')}</ol>
    ${comms.length ? `<div class="bib-comms">
      <h4 class="bib-h4">Personal communications — in-text only</h4>
      <p class="bib-lead">These stay out of the reference list. Use the in-text form where you
      refer to them.</p>
      <ol class="bib-list">${comms.map(row).join('')}</ol>
    </div>` : ''}
  </div>`;
}

function actions(p){
  return `<div class="panel p-5">
    <h3 class="bib-h3">Take it with you</h3>
    <div class="bib-acts">
      <button class="bib-btn bib-go" data-bibcopy>Copy the reference list</button>
      <button class="bib-btn bib-alt" data-bibcopycites>Copy my in-text citations</button>
      <button class="bib-btn bib-alt" data-bibprint>Print it</button>
    </div>
    <p class="bib-note"><strong>In Word or Docs:</strong> select the pasted list, then set a
    <em>hanging indent</em> of 1.27&nbsp;cm — Format → Paragraph → Special → Hanging. APA wants the
    first line of each reference flush and the rest indented. The printed version does it for you.</p>
  </div>`;
}

function checker(p){
  const n = p.entries.length;
  if(!n) return '';
  return `<div class="panel p-5 bib-check">
    <h3 class="bib-h3">Have it checked</h3>
    <p class="bib-lead">This is the only place AI belongs in a bibliography: checking a list you
    have already built. It asks whether your formatting is right and whether anything is thin —
    and it is told, in the prompt, that it must not add a single source.</p>
    <button class="bib-btn bib-alt" data-bibcheckcopy>Copy the checking prompt</button>
    <p class="bib-note">If it comes back with a source you did not give it, that source does not
    exist. Delete it and tell your teacher the AI did that — it is worth knowing.</p>
  </div>`;
}

function foot(){
  return `<p class="bib-build">${BIB_BUILD} · APA 7th edition · sources you type, never sources we find</p>`;
}

/* ============================================================
   OUTPUT
   ============================================================ */

function listText(p){
  const refs = sorted(p);
  const cites = refs.filter(e => e.type !== 'interview').map(e => plain(format(e)));
  const comms = refs.filter(e => e.type === 'interview').map(e => plain(format(e)));
  let out = 'References\n\n' + (cites.length ? cites.join('\n\n') : '(nothing yet)');
  if(comms.length) out += '\n\n\nPersonal communications — cite these in your text only, ' +
    'not in the reference list:\n\n' + comms.join('\n\n');
  return out;
}

function citesText(p){
  return sorted(p).map(e => `${inText(e)}  —  ${plain(format(e)).slice(0,70)}…`).join('\n');
}

function checkPrompt(p){
  return `You are checking a Year 11-13 NCEA student's reference list for correct APA 7th edition formatting.

ABSOLUTE RULE: do not add, suggest, supply, or invent any source. Not one, not even a better
version of one that is already here, and not even if I ask you to later in this conversation.
You have no way of knowing what I actually read, and a fabricated reference in assessed work is
academic misconduct. If you think a source is missing, say what KIND of source would strengthen
the work and where I could look for it myself. Never name a specific one.

What to do, in this order:

1. For each reference, say whether the APA 7 formatting is correct. If it is not, show the
   corrected version using ONLY the details already present, and say which rule applies.
   Check in particular: author initials and the order of names, the ampersand before the last
   author, sentence case in titles, what is italicised and what is not, the full stop after a
   DOI or URL (there should be none), and whether (n.d.) is used correctly.

2. Tell me if any reference is missing a detail that APA requires, and say exactly where on the
   source I would find it — on the page, in the front matter, under the headline.

3. Tell me whether the list is in correct alphabetical order.

4. Comment on the range of the list as a whole: is it all one kind of source, all one viewpoint,
   all from one year, all from one website? Say so plainly. Do not fix it by naming sources.

5. Finally, remind me of anything in the list that should not be in a reference list at all —
   personal communications, for instance, which APA cites in the text only.

My reference list:

${listText(p)}`;
}

function printIt(p){
  const refs = sorted(p);
  const cites = refs.filter(e => e.type !== 'interview');
  const comms = refs.filter(e => e.type === 'interview');
  const esc2 = s => esc(s);
  const row = e => `<li class="r"><span class="ref">${html(format(e))}</span>${
    S.showNotes && (e.used||'').trim()
      ? `<span class="used"><b>Used for:</b> ${esc2(e.used)}</span>` : ''
  }${e.type !== 'interview'
      ? `<span class="it">In text: ${esc2(inText(e))}</span>` : ''}</li>`;

  const w = window.open('', '_blank');
  if(!w){ alert('Your browser blocked the print window. Allow pop-ups for this site and try again.'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc2(p.name)} — references</title><style>
  @page{ margin:18mm; }
  body{ font:12pt/1.6 Georgia,'Times New Roman',serif; color:#000; margin:0; }
  h1{ font-size:15pt; margin:0 0 2mm; }
  .sub{ font-size:9pt; color:#444; margin:0 0 7mm; font-family:Arial,sans-serif; }
  h2{ font-size:12pt; margin:8mm 0 3mm; }
  ol{ list-style:none; margin:0; padding:0; }
  li.r{ margin:0 0 5mm; padding-left:12.7mm; text-indent:-12.7mm; }
  .ref{ display:block; }
  .used, .it{ display:block; padding-left:0; text-indent:0; font-family:Arial,sans-serif;
    font-size:8.5pt; color:#333; margin-top:1mm; }
  .it{ color:#555; }
  .nb{ font-family:Arial,sans-serif; font-size:8.5pt; color:#444; border-top:1px solid #bbb;
    margin-top:8mm; padding-top:3mm; }
</style></head><body>
<h1>${esc2(p.name)}</h1>
<p class="sub">Reference list · APA 7th edition · ${cites.length} source${cites.length===1?'':'s'} ·
printed ${new Date().toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'})}</p>
<h2>References</h2>
<ol>${cites.length ? cites.map(row).join('') : '<li class="r">(nothing yet)</li>'}</ol>
${comms.length ? `<h2>Personal communications</h2>
<p class="sub">Cited in the text only. These do not belong in the reference list above.</p>
<ol>${comms.map(row).join('')}</ol>` : ''}
<p class="nb">Every source here was entered by hand from the source itself. Nothing was supplied
by an AI. &copy; 2026 David Kennedy · Waiheke High School</p>
</body></html>`);
  w.document.close();
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 250);
}

function copy(text, btn, done){
  const ok = () => { if(!btn) return; const was = btn.textContent;
    btn.textContent = done || 'Copied'; setTimeout(()=>{ btn.textContent = was; }, 1400); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(ok, () => fallback(text, ok));
  } else fallback(text, ok);
}
function fallback(text, ok){
  const t = document.createElement('textarea');
  t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
  document.body.appendChild(t); t.select();
  try{ document.execCommand('copy'); ok(); }catch(e){ alert('Copying failed — select the text and copy it by hand.'); }
  document.body.removeChild(t);
}

/* ============================================================
   EVENTS  (delegated: the form is rebuilt on every keystroke-ish change)
   ============================================================ */

function wire(){
  const r = R(); if(!r || r.dataset.bibWired) return;
  r.dataset.bibWired = '1';

  r.addEventListener('click', ev => {
    const t = ev.target.closest('[data-bibnew],[data-bibaddp],[data-bibp],[data-bibrename],' +
      '[data-bibdelp],[data-bibtype],[data-bibsave],[data-bibcancel],[data-bibedit],' +
      '[data-bibdel],[data-bibcopy],[data-bibcopycites],[data-bibprint],[data-bibcheckcopy]');
    if(!t) return;
    const d = t.dataset, p = proj();

    if('bibnew' in d){
      const el = document.getElementById('bib-newname');
      const name = (el && el.value.trim()) || 'My research';
      S.projects.push({ id: uid(), name, entries: [] });
      S.active = S.projects[S.projects.length-1].id;
      save(); render(); return;
    }
    if('bibaddp' in d){
      const name = prompt('What is this list for?\n\ne.g. “Geography 3.3 research”');
      if(name === null) return;
      S.projects.push({ id: uid(), name: name.trim().slice(0,80) || 'My research', entries: [] });
      S.active = S.projects[S.projects.length-1].id;
      S.draft = null; S.editing = null; save(); render(); return;
    }
    if('bibp' in d){ S.active = d.bibp; S.draft = null; S.editing = null; save(); render(); return; }
    if('bibrename' in d && p){
      const name = prompt('Rename this list', p.name);
      if(name === null) return;
      p.name = name.trim().slice(0,80) || p.name; save(); render(); return;
    }
    if('bibdelp' in d && p){
      if(!confirm(`Delete “${p.name}” and all ${p.entries.length} source` +
        `${p.entries.length===1?'':'s'} in it?\n\nThis cannot be undone.`)) return;
      S.projects = S.projects.filter(x => x.id !== p.id);
      S.active = (S.projects[0]||{}).id || null;
      S.draft = null; S.editing = null; save(); render(); return;
    }
    if('bibtype' in d){
      S.draft = { id: uid(), type: d.bibtype }; S.editing = null; render();
      const first = document.getElementById('bib-f-authors') || document.querySelector('.bib-in');
      if(first) first.focus();
      return;
    }
    if('bibcancel' in d){ S.draft = null; S.editing = null; render(); return; }
    if('bibsave' in d && p && S.draft){
      const miss = TYPES[S.draft.type].fields
        .filter(f => F[f] && F[f].req && !(S.draft[f]||'').trim())
        .filter(f => f !== 'authors')         // a missing author is legitimate; flagged, not blocked
        /* a full date carries the year inside it, so don't nag for both */
        .filter(f => !(f === 'year' && (S.draft.fulldate||'').trim()))
        .map(f => F[f].label);
      if(miss.length && !confirm(`Still blank: ${miss.join(', ')}.\n\nAdd it anyway?`)) return;
      if(S.editing){
        const i = p.entries.findIndex(x => x.id === S.editing);
        if(i >= 0) p.entries[i] = Object.assign({}, S.draft, { id: S.editing });
      } else p.entries.push(Object.assign({}, S.draft));
      S.draft = null; S.editing = null; save(); render(); return;
    }
    if('bibedit' in d && p){
      const e = p.entries.find(x => x.id === d.bibedit);
      if(!e) return;
      S.draft = Object.assign({}, e); S.editing = e.id; render();
      const f = document.querySelector('.bib-form');
      if(f && f.scrollIntoView) f.scrollIntoView({ block:'center', behavior:'smooth' });
      return;
    }
    if('bibdel' in d && p){
      const e = p.entries.find(x => x.id === d.bibdel);
      if(!e || !confirm('Delete this source from the list?')) return;
      p.entries = p.entries.filter(x => x.id !== d.bibdel);
      if(S.editing === d.bibdel){ S.draft = null; S.editing = null; }
      save(); render(); return;
    }
    if('bibcopy' in d && p){ copy(listText(p), t, 'Copied — now set the hanging indent'); return; }
    if('bibcopycites' in d && p){ copy(citesText(p), t); return; }
    if('bibprint' in d && p){ printIt(p); return; }
    if('bibcheckcopy' in d && p){ copy(checkPrompt(p), t, 'Copied — paste it into your AI'); return; }
  });

  /* The live preview updates as they type, without rebuilding the field
     they are typing into — so focus and caret stay put. */
  const touch = ev => {
    const f = ev.target.dataset ? ev.target.dataset.bibf : null;
    if(f && S.draft){
      S.draft[f] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
      const pv = R().querySelector('.bib-preview');
      if(pv) pv.innerHTML = `<p class="bib-plabel">As it will appear</p>
        <p class="bib-ref">${html(format(S.draft))}</p>
        <p class="bib-intext">In your writing: <code>${esc(inText(S.draft))}</code></p>`;
      return;
    }
    if(ev.target.dataset && 'bibnotes' in ev.target.dataset){
      S.showNotes = ev.target.checked; save(); render();
    }
  };
  r.addEventListener('input', touch);
  r.addEventListener('change', touch);

  r.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' && ev.target.id === 'bib-newname'){
      ev.preventDefault();
      const b = R().querySelector('[data-bibnew]'); if(b) b.click();
    }
  });
}

/* ---------- entry point ---------- */

load();
window.Bibliography = {
  open: render,
  state: S,
  /* exposed so the validator and the test harness can check the formatter
     against known-good APA without driving the UI */
  format: e => plain(format(e)),
  inText,
  build: BIB_BUILD
};

})();
