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

const W_BUILD = 'build 97 — writing tools';

const R = () => document.getElementById('writing-root');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- state ---------- */

const KEY = 'ncea_writing_v1';
/* picking is the one part of the state that is never saved: whether the
   standard list is open is a this-moment thing, not something to restore. */
let S = { std: null, shape: null, answers: {}, picking: false, idea: null, lastStep: null, example: null, exLevel: null, asksOpen: null, used: {}, recent: [], shapeOpen: false,
          nav: {} };   // where they are in the level/faculty/subject drill-down

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({
    std: S.std, shape: S.shape, answers: S.answers,
    used: S.used, recent: S.recent })); }
  catch(e){ /* private browsing or a full quota — not worth interrupting them */ }
}
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(o){ S.std = o.std || null; S.shape = o.shape || null;
      S.answers = o.answers || {};
      S.used = (o.used && typeof o.used === 'object') ? o.used : {};
      S.recent = Array.isArray(o.recent) ? o.recent : []; }
  }catch(e){ /* corrupt store: start clean rather than die */ }
}

/* ============================================================
   WHICH STANDARDS THIS IS FOR
   An explicit list, not a guess. An earlier version read the
   standard's format and evidence text for words like "essay",
   which was wrong in both directions and silently so \u2014 Level 1
   English, whose two externals are written exams, was missing
   altogether.

   The rule used to build this list: a standard is in when the
   thing being marked is extended prose that explains, analyses,
   evaluates or argues. It is out when the marked output is
   skills application, numerical or spatial problem-solving, a
   practical investigation, a performance, a visual or oral text,
   or the conduct of a research process.

   TEACHER REVIEW: these are my readings of the titles and
   assessment formats, not NZQA rulings. The sciences and maths
   are the least certain \u2014 Chemistry and Physics are here only
   where the answer is written rather than calculated, which a
   head of department may well judge differently. Adding or
   removing a standard is one edit to the list below; the
   validator checks every entry still resolves to a real
   standard, so a typo cannot pass silently.
   ============================================================ */

const WRITING_STANDARDS = {
  '1': {
    "Geography": ['1.1', '1.3', '1.4'],
    "History": ['1.1', '1.2', '1.3', '1.4'],
    "Science": ['1.1', '1.2', '1.3', '1.4'],
    "Chemistry and Biology": ['1.1', '1.2', '1.3', '1.4'],
    "Physics, Earth and Space Science": ['1.1', '1.3', '1.4'],
    "English": ['1.1', '1.2', '1.3', '1.4'],
    "Te Reo Māori": ['1.4'],
    "Physical Education": ['1.2', '1.3', '1.4'],
    "Health Studies": ['1.1', '1.2', '1.3', '1.4'],
    "Commerce": ['1.1', '1.2', '1.3', '1.4'],
    "Digital Technologies": ['1.3'],
    "Drama": ['1.4'],
    "Music": ['1.3'],
  },
  '2': {
    "Geography": ['2.1', '2.2', '2.3', '2.6', '2.7'],
    "History": ['2.2', '2.3', '2.4', '2.5', '2.6'],
    "Classical Studies": ['2.1', '2.2', '2.3', '2.4', '2.5'],
    "Business Studies": ['2.1', '2.2', '2.5'],
    "Biology": ['2.2', '2.3', '2.4', '2.5', '2.7'],
    "Chemistry": ['2.3'],
    "Earth & Space Science": ['2.2', '2.5', '2.6'],
    "English": ['2.1', '2.2', '2.3', '2.4', '2.7', '2.8', '2.9', '2.10'],
    "Mathematics and Statistics": ['2.11'],
    "Te Reo Māori": ['2.4', '2.5'],
    "Media Studies": ['2.1', '2.2', '2.3', '2.4', '2.7'],
    "Art History": ['2.5', '2.6', '2.7', '2.8'],
    "Physical Education": ['2.1', '2.2', '2.3', '2.5', '2.6', '2.7', '2.9', '2.10'],
    "Health": ['2.1', '2.2', '2.4', '2.5'],
    "Drama": ['2.3', '2.5', '2.7'],
    "Music": ['2.7', '2.9'],
    "Digital Technologies": ['2.9'],
    "Psychology": ['2.1', '2.2', '2.4', '2.5'],
  },
  '3': {
    "Geography": ['3.1', '3.2', '3.3', '3.6', '3.7'],
    "Classical Studies": ['3.1', '3.2', '3.3', '3.4', '3.5'],
    "Biology": ['3.2', '3.3', '3.4', '3.5', '3.6', '3.7'],
    "Chemistry": ['3.3'],
    "Physics": ['3.7'],
    "Physical Education": ['3.1', '3.2', '3.3', '3.5', '3.6', '3.7', '3.8', '3.9'],
    "Health": ['3.1', '3.2', '3.3', '3.4', '3.5'],
    "English": ['3.1', '3.2', '3.3', '3.4', '3.7', '3.8', '3.9'],
    "Te Reo Māori": ['3.4', '3.5'],
    "Te Ao Haka": ['3.1', '3.4'],
    "Statistics": ['3.12'],
    "Art History": ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'],
    "Digital Technologies": ['3.9'],
    "Earth & Space Science": ['3.2', '3.4', '3.5'],
    "Media Studies": ['3.1', '3.2', '3.3', '3.4', '3.7'],
    "Music": ['3.7'],
    "Drama": ['3.3', '3.5', '3.7'],
    "Business Studies": ['3.1', '3.2', '3.5', '3.7'],
    "History": ['3.2', '3.3', '3.4', '3.5', '3.6'],
    "Psychology": ['3.1', '3.2', '3.4', '3.5'],
    "Economics": ['3.1', '3.2', '3.3', '3.4', '3.5'],
  },
  'S': {
    "Biology": ['S'],
    "Chemistry": ['S'],
    "Physics": ['S'],
    "Calculus": ['S'],
    "Statistics": ['S'],
    "English": ['S'],
    "History": ['S'],
    "Geography": ['S'],
    "Classical Studies": ['S'],
    "Economics": ['S'],
    "Drama": ['S'],
  },};

const isWriting = (st, level, subject) => {
  const L = WRITING_STANDARDS[level]; if(!L) return false;
  const refs = L[subject]; if(!refs) return false;
  return refs.indexOf(st.ref || st.code) !== -1;
};

const LEVEL_NAME = { '1':'Level 1', '2':'Level 2', '3':'Level 3', 'S':'Scholarship' };

function allWritingStandards(){
  const D = window.NCEA_DATA || {};
  const out = [];
  for(const lvl of ['1','2','3','S']){
    const d = D[lvl]; if(!d) continue;
    for(const [subject, s] of Object.entries(d.subjects || {}))
      for(const st of s.standards || [])
        if(isWriting(st, lvl, subject)) out.push({ level: lvl, subject, st });
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
    example:{ topic:"Night-time phone use and sleep", byLevel:{"1": ["Using a phone late at night makes it harder to fall asleep.", "A survey of 1,200 New Zealand teenagers found that those using screens after 10pm took 38 minutes longer to fall asleep than those who did not.", "That delay happens because the blue light from a screen stops the body making melatonin, the chemical that signals it is time to sleep, so the body is still being told it is daytime.", "This matters because 38 minutes a night adds up to more than four hours of lost sleep across a school week, which is why so many students are exhausted by Thursday."], "2": ["Late-night phone use is the single biggest cause of poor sleep among teenagers.", "A survey of 1,200 New Zealand teenagers found those using screens after 10pm took 38 minutes longer to fall asleep and scored measurably worse on next-day concentration tasks.", "The mechanism is hormonal: short-wavelength light suppresses melatonin production, so the body never receives the signal that night has begun, and the whole sleep cycle shifts later rather than simply shortening.", "The significance lies in that shift rather than in the lost minutes, because school start times do not move with it — the sleep is not only shorter, it falls at the wrong time of day."], "3": ["Late-night phone use is the most significant modifiable cause of teenage sleep loss.", "A survey of 1,200 New Zealand teenagers found those using screens after 10pm took 38 minutes longer to fall asleep and scored lower on next-day concentration tasks.", "The mechanism is well established: short-wavelength light suppresses melatonin, delaying the circadian signal that initiates sleep, so the entire cycle shifts later while the school start time does not.", "The significance lies in that mismatch rather than in the delay itself — a later bedtime is survivable; a later bedtime against a fixed 8.45am start is not.", "The strongest objection is that anxious teenagers reach for phones because they cannot sleep, not the reverse; but the experimental studies, which assign screen use rather than observe it, find the delay persists among good sleepers too."]} },
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
    example:{ topic:"Why a dune erodes", byLevel:{"1": ["Dune erosion starts when storm waves become high enough to reach the bottom of the dune.", "The waves wash sand away from the base, the sand above it has nothing left to support it and slumps onto the beach, and the backwash then carries that sand out to sea.", "The result is that the dune face retreats several metres further inland after every big storm.", "This matters because the sand ends up offshore where waves cannot easily return it, so the dune does not simply grow back and the protection for the road behind it is permanently reduced."], "2": ["Dune erosion begins with a storm surge that lifts sea level high enough for waves to reach the dune toe.", "Wave action removes sand from the toe, which steepens the face beyond the angle sand can hold; the unsupported sand above then slumps, and the returning backwash carries it offshore into a sandbar.", "Each storm therefore moves the dune face several metres inland and deposits the sand where fair-weather waves cannot readily return it.", "This matters because the two processes run at different speeds: a storm erodes in hours what the slower fair-weather rebuilding takes months to replace, so a single stormy season leaves a deficit the dune carries into the next."], "3": ["Dune erosion is set off not by waves alone but by the coincidence of storm surge with high tide, which lifts wave attack to the dune toe.", "Waves undercut the toe, the face steepens past the angle of repose, the unsupported sand slumps, and backwash transports it seaward into an offshore bar.", "The net result is a landward retreat of several metres per storm event, against a fair-weather recovery measured in centimetres per month.", "The significance is the asymmetry: erosion and accretion run on different timescales, so a cluster of storms in one season produces losses the system cannot recover before the next.", "The undercutting is the step that matters most, because everything after it follows automatically — which is why engineered protection targets the toe rather than the face."]} },
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
    example:{ topic:"Why a school recycling scheme worked", byLevel:{"1": ["The school's recycling scheme worked because students were involved in running it.", "The bins were designed by the Year 10 class and placed outside every classroom, and the plastic collected doubled in the first term.", "A survey also showed that most students used the bins because their own classmates had asked them to, rather than because a teacher told them.", "Together these show the scheme worked for two different reasons — it was easy to use and it carried pressure from other students — which is why an earlier scheme with the same bins but no student involvement had failed."], "2": ["The recycling scheme succeeded because it changed the practical conditions and the social expectations around waste at the same time.", "Practically, the student-designed bins put a collection point within ten metres of every classroom door, and plastic recovery doubled within a term.", "Socially, the survey showed 68 per cent of students named “other students asked me to” rather than “the school required it” as their reason for using them.", "Neither factor explains the result alone: the identical bins had been trialled two years earlier without student involvement and changed nothing, which shows convenience only worked once it carried social weight."], "3": ["The scheme succeeded because it lowered the practical cost of recycling and raised the social cost of not recycling at once.", "The practical change was measurable: collection points within ten metres of every classroom door, and a doubling of plastic recovery in one term.", "The social change appeared in attitudes rather than volumes — 68 per cent cited peer expectation rather than school policy as their reason for taking part.", "What the two together establish is that convenience was necessary but not sufficient; the earlier trial used the same bins without student ownership and recovered no more than before.", "Of the two, the social change carries the greater weight, because convenience had already been tested in isolation and failed."]} },
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
    example:{ topic:"Solar and wind generation", byLevel:{"1": ["Solar and wind power can be compared on how reliably they supply electricity when it is needed.", "Both are renewable, neither produces carbon dioxide while running, and both have become much cheaper over the last ten years.", "They differ in when they produce: solar panels generate only in daylight and nothing at all after sunset, while wind turbines can run at any hour as long as there is wind.", "For New Zealand that difference matters more than the cost does, because our demand for electricity peaks on winter evenings — exactly when solar produces nothing at all."], "2": ["Solar and wind generation are best compared on how well their output matches demand.", "Both are renewable, both produce no emissions in operation, and both have seen costs fall steeply over the past decade, so cost no longer separates them.", "They differ in the timing of output rather than the total: solar peaks at midday and falls to zero after sunset, while wind is less predictable hour to hour but is not confined to daylight.", "The timing difference is the one that decides the question for New Zealand, because national demand peaks on winter evenings — a source that is predictable but absent at peak is worth less than one that is unpredictable but sometimes present."], "3": ["Solar and wind are best compared not on cost per megawatt but on how far their output correlates with the demand curve.", "Both are low-emission in operation and both have seen costs fall by more than seventy per cent in a decade, so cost no longer separates them.", "They differ in the shape of their output: solar is daily and highly predictable but absent after sunset, while wind is erratic hour to hour yet uncorrelated with daylight.", "The second difference is the decisive one for New Zealand, where demand peaks on winter evenings: a source that is predictable but absent at peak is worth less than one that is unpredictable but sometimes present.", "The comparison itself shows what neither side shows alone — that reliability is a question of correlation with demand, not of variability on its own."]} },
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
    example:{ topic:"Why a local café closed", byLevel:{"1": ["The café's weekday customer numbers fell from about 180 to 120 over two years.", "Over the same two years the rent rose twice, lifting its fixed costs by about 40 per cent.", "Two other cafés opened within 200 metres, both staying open later into the evening.", "Taken together these show the café did not close because of one bad decision — the rent had already taken the money it would have needed to open later and compete."], "2": ["Between 2022 and 2024 the café's weekday customer count fell from around 180 to 120.", "Over the same period the lease was renegotiated twice, raising fixed monthly costs by about 40 per cent.", "Two competing cafés opened within 200 metres, both trading later into the evening.", "What follows is that the closure was structural rather than managerial: falling revenue and rising fixed costs can each be absorbed alone, but together they removed the margin that would have funded the longer hours the competition demanded."], "3": ["Weekday customer counts fell from roughly 180 to 120 between 2022 and 2024.", "Fixed costs rose about 40 per cent over the same period through two lease renegotiations.", "Two competitors opened within 200 metres, both trading later into the evening.", "What follows is less obvious than a story about competition: the margin that would have funded longer hours had already gone to rent, so the café could not answer the competition that then finished it.", "The order matters — had the rent risen after rather than before the competitors arrived, the same three facts would support a different conclusion."]} },
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
    example:{ topic:"Should school start later?", byLevel:{"1": ["Some people argue that school should not start later because it would push the end of the day back.", "They point out that sports practices and part-time jobs already run into the evening, and schools that have changed their start times report lower attendance at after-school sport.", "They are right about this: the school day does not get any shorter, so something at the other end has to give, and for some students that is paid work they rely on.", "Even so the case for a later start holds, because the lost hour affects some students in one activity while the extra sleep affects every student in every morning lesson."], "2": ["The strongest objection to a later school start is that it simply moves the problem to the end of the day.", "Schools that have shifted their start report later finishes, and surveys show both reduced attendance at after-school sport and fewer hours worked in part-time jobs.", "The objection is right about the mechanism, and right about who pays: the day does not shorten, so something gives at the other end, and for students who need the income that something is wages rather than sport.", "It does not outweigh the case, because the two costs are not comparable — the displaced hour falls on a minority in one activity, while the sleep gain reaches every student in every morning lesson."], "3": ["The strongest objection is that a later start displaces rather than solves, shifting the cost from the morning to the evening.", "The evidence is real: districts that have shifted start times report measurable falls in after-school sport participation and in paid work hours among senior students.", "The objection is right in principle and right about who pays — the cost falls on students who need the income, which is not a trivial redistribution.", "It does not defeat the case, because the two costs are not of the same kind: lost evening hours are spread out and partly substitutable, while lost morning attention is universal and strikes the thing school exists to do.", "What the objection does establish is that a later start is a policy with losers, which means it needs mitigation rather than simply a majority."]} },
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
    example:{ topic:"A line from a short story", byLevel:{"1": ["At this point in the story the narrator has just learned that her brother is not coming back.", "Instead of describing how she feels, the writer describes the kitchen as “still set for four”.", "The writer is using understatement — the number does the work, because four places tell us someone is missing without the narrator having to say so.", "The effect is that the reader works the loss out instead of being told about it, which makes it land harder and fits the way the whole story keeps feeling hidden behind ordinary objects."], "2": ["The moment comes immediately after the narrator learns her brother will not return.", "Rather than describing her reaction, the writer gives us a kitchen “still set for four”.", "The technique is understatement by displacement: the emotional weight is handed to a domestic object, and the numeral performs the work an adjective would ordinarily do.", "The effect is that the reader performs the realisation instead of receiving it, which matters because it is the method the whole story runs on — feeling is never named, only furnished, so the reader is made complicit in every discovery."], "3": ["The line falls at the hinge of the story, immediately after the narrator learns her brother will not return.", "The writer offers no reaction at all, only a kitchen “still set for four”.", "The technique is understatement by displacement — grief is handed to a countable domestic detail, and the numeral performs the work an adjective would ordinarily do.", "The effect is to move the act of realisation from narrator to reader, which matters because it establishes the method the rest of the story depends on: feeling is never named, only furnished.", "Stating it plainly would gain clarity and lose the reader's complicity, and it is the complicity that makes the ending land."]} },
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
    example:{ topic:"Does social media strengthen or weaken friendship?", byLevel:{"1": ["The question asks whether social media makes friendships stronger or weaker.", "I will argue that it does both: it strengthens the friendships people already have, but makes new ones harder to start.", "I will look first at how people keep in touch, then at how they meet new people, and finally at what happens when friendships end, because the answer is different at each stage."], "2": ["The question asks not whether social media changes friendship but whether that change counts as a strengthening or a weakening.", "This essay argues that the choice is a false one: social media deepens the friendships a person already has while thinning the conditions in which new ones begin.", "It takes maintenance first, then formation, then dissolution, because the evidence points in a different direction at each of the three and a single verdict would hide that."], "3": ["The question appears to ask for a verdict, but it assumes that strengthening and weakening are the available answers.", "This essay argues that social media acts asymmetrically across the life of a friendship, deepening maintenance while degrading formation, so that any single verdict conceals more than it reports.", "It takes the three stages in turn — maintenance, formation, dissolution — because the evidence points in different directions at each.", "The tension worth answering is that one affordance, frictionless contact, produces the gain at one stage and the loss at another."]} },
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
    example:{ topic:"Does social media strengthen or weaken friendship?", byLevel:{"1": ["The evidence has shown that people who use social media keep in touch with more friends, but meet fewer new people face to face.", "So the answer is not simply stronger or weaker — social media strengthens the friendships people already have and weakens their chances of making new ones.", "This matters because the friendships people make as teenagers are often the ones they keep, so a tool that protects old friendships while blocking new ones has a larger effect than it first appears."], "2": ["The evidence has established that frequency of contact rises with social media use while the formation of new close friendships falls.", "The answer is therefore conditional rather than simple: social media strengthens maintenance and weakens formation.", "That conditional answer matters beyond this essay, because any policy treating social media as uniformly good or bad for young people will misfire at whichever end it has not accounted for."], "3": ["The evidence has established an asymmetry: contact frequency rises with use, while the rate at which new close friendships form falls.", "The answer is therefore not a verdict but a distribution — social media is good for the friendships a person has and bad for the ones they have not yet made.", "This matters beyond the essay because interventions are designed around verdicts, and a policy built on either half of this answer produces the opposite of its intention at the other.", "What the argument does not settle is whether the two effects are separable in practice; if they are not, the trade-off is the real question."]} },
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

/* Highlighting the operative words is the point of the rail: a student
   skimming it should see "adverb" and the comma that follows it, not a
   wall of equally-weighted prose. Both marks are plain substrings of the
   text they sit in, checked by the validator, so neither can drift. */
function markUp(text, needle){
  const t = esc(text);
  if(!needle) return t;
  const n = esc(needle);
  const at = t.indexOf(n);
  if(at < 0) return t;
  return t.slice(0, at) + '<b class="wr-key">' + n + '</b>' + t.slice(at + n.length);
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
    mark:'preposition', egMark:'By 1863,',
    frame:'By [when], ' },
  { key:'participle-ing', cat:'opener', label:'Open one with an -ing verb',
    why:'Links an action to the main clause without a connective.',
    eg:'Facing falling yields, the farmers changed their irrigation.',
    mark:'-ing verb', egMark:'Facing falling yields,',
    frame:'[Verb]ing [what], ' },
  { key:'participle-ed', cat:'opener', label:'Open one with an -ed verb',
    why:'Describes the subject before you name it.',
    eg:'Weakened by erosion, the cliff face collapsed within a decade.',
    mark:'-ed verb', egMark:'Weakened by erosion,',
    frame:'[Verb]ed by [what], ' },
  { key:'subordinate', cat:'opener', label:'Open one with While, Although or Because',
    why:'Shows the relationship between two ideas rather than stating them in sequence.',
    eg:'Although the data showed a rise, the sample was too small to be conclusive.',
    mark:'While, Although or Because', egMark:'Although the data showed a rise,',
    frame:'Although [what is true], ' },
  { key:'adverb', cat:'opener', label:'Open one with an adverb',
    why:'Sets the manner or degree up front.',
    eg:'Gradually, the sediment built up behind the groyne.',
    mark:'adverb', egMark:'Gradually,',
    frame:'[Adverb]ly, ' },

  { key:'appositive', cat:'inside', label:'Name it, then define it between commas',
    why:'Gets a definition in without a whole sentence spent on it. Useful whenever a marker needs to see you know the term.',
    eg:'Longshore drift, the movement of sediment along a shore, had shifted the whole beach north.',
    mark:'between commas', egMark:', the movement of sediment along a shore,',
    frame:'[Term], [what it means], ' },
  { key:'colon', cat:'inside', label:'Use a colon to deliver what you just promised',
    why:'Sets an expectation in the first half and meets it in the second. Strong for a definition, a list, or a single telling example.',
    eg:'One factor outweighed the rest: the land itself.',
    mark:'colon', egMark:': the land itself.',
    frame:'[The set-up]: ' },
  { key:'semicolon', cat:'inside', label:'Join two linked ideas with a semicolon',
    why:'Holds two ideas in one sentence so the reader sees they belong together, without a connective doing the work.',
    eg:'The groyne trapped sediment on one side; the beach beyond it narrowed every year.',
    mark:'semicolon', egMark:'; the beach beyond it narrowed every year.',
    frame:'[First idea]; [the idea it leads to].' },
  { key:'dashes', cat:'inside', label:'Drop detail in between a pair of dashes',
    why:'Adds a qualification mid-sentence without starting a new one. Use once in a paragraph, not twice.',
    eg:'The cliff — undercut, saturated and unsupported — failed in a single night.',
    mark:'pair of dashes', egMark:'— undercut, saturated and unsupported —',
    frame:'[Subject] \u2014 [the detail] \u2014 [verb] [rest].' },
  { key:'triple', cat:'inside', label:'Three items, each bigger than the last',
    why:'Three is the shortest group that reads as a pattern. Put the weightiest one last.',
    eg:'The confiscation took their farms, their river and their authority.',
    mark:'Three items', egMark:'their farms, their river and their authority',
    frame:'[One], [two] and [the biggest one].' },
  { key:'short', cat:'inside', label:'Follow a long sentence with a very short one',
    why:'A five-word sentence after a thirty-word one lands hard. This is how you signal the point that matters.',
    eg:'The land itself was the prize.',
    mark:'very short one', egMark:'The land itself was the prize.',
    frame:'[Five words or fewer].' },

  /* ---- advanced: Level 3 and Scholarship, and only where the subject's own
     writing actually rewards them. These are rhetorical constructions; in a
     Level 1 paragraph they read as strain rather than control, which is why
     they are gated. TEACHER REVIEW: the subject lists below are my judgement,
     not NZQA's. ---- */
  { key:'midparticiple', cat:'advanced', label:'Put the participle in the middle',
    why:'Interrupts the main clause to qualify the subject before the verb lands. Packs a second idea in without a second sentence.',
    eg:'The Crown, having already massed troops on the border, treated the refusal as a pretext.',
    mark:'participle in the middle', egMark:', having already massed troops on the border,',
    frame:'[Subject], having [done what], [main verb] [rest].' },
  { key:'periodic', cat:'advanced', label:'Hold the main clause until the end',
    why:'Everything qualifies first and the point lands last, so the reader has to take the conditions on board before the claim arrives. Use once in a piece, for the sentence that matters most.',
    eg:'Because the boundary had been set, because the Crown knew it, and because the troops crossed anyway, the invasion was deliberate.',
    mark:'main clause until the end', egMark:'the invasion was deliberate.',
    frame:'Because [one], because [two], and because [three], [the point].',
    subjects:/english|history|classical|media|art history|geography|economics|psychology|health|education/i },
  { key:'inversion', cat:'advanced', label:'Invert it for emphasis',
    why:'Putting the adverb first and the auxiliary before the subject throws weight onto the thing you fronted. Striking once, mannered twice.',
    eg:'Rarely had a single boundary carried so much weight.',
    mark:'Invert', egMark:'Rarely had',
    frame:'Rarely [had/has/did] [subject] [verb] [rest].',
    subjects:/english|history|classical|media|art history/i },
  { key:'antithesis', cat:'advanced', label:'Set one thing against another',
    why:'Balances what it is not against what it is, in one sentence. Built for judgement writing, where the marker wants to see you rule something out as well as in.',
    eg:'The war was fought not over sovereignty but over land.',
    mark:'one thing against another', egMark:'not over sovereignty but over land',
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
  r.innerHTML = head() + buildPane() + foot() + exampleModal();
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

/* There is no second tab. The whole-paragraph report used to live behind
   one; it now sits under the paragraph it describes, which is where a
   student is already looking. */

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
  /* once they have a shape and are writing, this has been read and is just
     something to scroll past \u2014 so it folds itself, with one click back */
  const open = S.asksOpen === true || (S.asksOpen !== false && !S.shape);
  if(!open) return `<div class="panel p-4 wr-stdbar wr-asks">
    <div>
      <p class="wr-stdlab">What ${esc(cur.st.ref || cur.st.code)} is marked on</p>
      <p class="wr-stdsub">${esc((cur.st.bandShift || {}).mToE || (cur.st.bandShift || {}).aToM
        || 'The band shift and the pitfalls for this standard.')}</p>
    </div>
    <button class="wr-btn wr-ghost" data-wrasks>Show</button>
  </div>`;
  return `<div class="panel p-4 wr-asks">
    <div class="wr-stdbar">
      <h3 class="wr-h3">What ${esc(cur.st.ref || cur.st.code)} is actually marked on</h3>
      ${S.shape ? '<button class="wr-btn wr-ghost" data-wrasks>Hide</button>' : ''}
    </div>
    <p class="wr-hint">Straight from the standard. Your paragraph is one piece of this, not all of it.</p>
    ${b.aToM ? `<div class="wr-band"><p class="wr-bandh">Achieved \u2192 Merit</p>
      <p class="wr-bandb">${esc(b.aToM)}</p></div>` : ''}
    ${b.mToE ? `<div class="wr-band"><p class="wr-bandh">Merit \u2192 Excellence</p>
      <p class="wr-bandb">${esc(b.mToE)}</p></div>` : ''}
    ${pit.length ? `<p class="wr-rh">What loses marks in this standard</p>
      <ul class="wr-pits">${pit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

/* ---- a worked example of each shape ----
   The topics are deliberately unrelated to any standard: the point is to
   show what the SHAPE does, and a student reading an example from their own
   standard tends to borrow the content. Each sentence is tagged with the
   question it answers, so the paragraph and the questions above it are
   visibly the same thing. Level 1, 2 and 3 are the same topic written three
   ways, so what changes is the demand rather than the subject. */

/* With a standard chosen there is one right level to show, so the switcher
   is noise: a Level 1 student does not need to be offered a Level 3 answer
   they will be tempted to copy. Without a standard the three are offered,
   because seeing the same paragraph at three levels is the teaching point. */
function exampleLevel(){
  const l = levelOf();
  if(l === 'S') return '3';
  if(l === '1' || l === '2' || l === '3') return l;
  return S.exLevel || '2';
}
const exampleLocked = () => !!levelOf();

function exampleModal(){
  const sh = S.example ? shapeById(S.example) : null;
  if(!sh || !sh.example) return '';
  /* a locked level ignores whatever the switcher was last set to */
  const lvl = exampleLocked() ? exampleLevel() : (S.exLevel || exampleLevel());
  const parts = sh.example.byLevel[lvl] || sh.example.byLevel['2'];
  const steps = sh.steps.concat(sh.deepen ? [{ q: sh.deepen, deep: true }] : []);
  return `<div class="ev-back wr-exback" data-wrexback>
    <div class="ev-card wr-excard" role="dialog" aria-modal="true"
         aria-label="Example of ${esc(sh.name)}">
      <button class="wr-exclose" data-wrexclose aria-label="Close">\u00d7</button>
      <p class="wr-exlab">Worked example</p>
      <h3 class="wr-h3">${esc(sh.name)}</h3>
      <p class="wr-exsub">${esc(sh.example.topic)}. The topic does not matter here; the
        shape does.</p>
      ${exampleLocked()
        ? `<p class="wr-exlock">Written for <strong>${esc(LEVEL_NAME[levelOf()])}</strong>${
             levelOf() === 'S' ? ', using the Level 3 example' : ''}, to match the standard you
             chose. It is one way of doing it, not a graded exemplar.</p>`
        : `<p class="wr-exlock">The same paragraph at three levels. Each is one way of doing it,
             not a graded exemplar. Pick your standard and this shows only yours.</p>
           <div class="seg wr-exseg">
             ${['1','2','3'].map(l => `<button data-wrexlevel="${l}"
               aria-pressed="${l === lvl}">Level ${l}</button>`).join('')}
           </div>`}
      <div class="wr-expara">${parts.map((t, i) =>
        `<span class="wr-exs wr-exs${i % 4}">${esc(t)}</span> `).join('')}</div>
      <p class="wr-rh">Which sentence does what</p>
      <ol class="wr-exbreak">${parts.map((t, i) => `<li>
        <span class="wr-exnum wr-exs${i % 4}">${i + 1}</span>
        <span class="wr-exq">${esc(steps[i] ? steps[i].q : '')}${steps[i] && steps[i].deep
          ? ' <span class="wr-rec">Level 3</span>' : ''}</span>
        <span class="wr-ext">${esc(t)}</span>
      </li>`).join('')}</ol>
      <p class="wr-hint">This is an example to read, not a template to fill in. The questions
        above are the same ones you answer in your own words.</p>
    </div>
  </div>`;
}

/* ---- feedback on the craft, not the content ----
   The AI on the other end cannot see the standard, the task or the evidence,
   so asking it about the content invites a confident answer about something
   it cannot know. This prompt asks only about things visible in the text
   itself: whether the paragraph does what the shape requires, how the
   sentences are built, and whether that is enough for the level. It also
   forbids rewriting, because a rewritten paragraph is no longer the
   student's work. */

const AI_SITES = [
  { key:'chatgpt', name:'ChatGPT', url:'https://chatgpt.com/' },
  { key:'gemini',  name:'Gemini',  url:'https://gemini.google.com/app' },
  { key:'claude',  name:'Claude',  url:'https://claude.ai/new' }
];

function craftPrompt(){
  const text = currentText();
  const sh = shapeById(S.shape);
  const lvl = levelOf();
  const ex = lvl && LEVEL_EXPECT[lvl];
  const a = analyse(text);
  const used = Object.entries(a.openers || {})
    .map(([k, n]) => `${OPENER_NAME[k] || k} \u00d7${n}`).join(', ');
  const openers = movesFor('opener');
  const untried = openers.filter(m => !a.openers[m.key]).map(m => m.label);

  const L = [];
  L.push('You are giving a New Zealand secondary student feedback on the CRAFT of one paragraph.');
  L.push('');
  L.push('RULES, which matter more than being helpful:');
  L.push('1. Do NOT rewrite the paragraph, and do not write any replacement sentence. If you supply words, the work stops being theirs and cannot be handed in.');
  L.push('2. Do NOT comment on whether the content is correct, sufficient or relevant. You cannot see their standard, their task or their source material, so you do not know.');
  L.push('3. Do NOT give or estimate a grade.');
  L.push('4. Comment ONLY on what is visible in the text: structure, sentence construction, and whether each sentence does its job.');
  L.push('5. Where something is weak, name it and ask a question that would help them fix it themselves.');
  L.push('');
  if(lvl){
    L.push(`LEVEL: NCEA ${LEVEL_NAME[lvl]}.`);
    if(ex){ L.push(`What this level expects of a paragraph: ${ex.line}`);
            L.push(`Expected shape: ${ex.shape}`); }
    L.push('');
  }
  if(sh){
    L.push(`PARAGRAPH SHAPE they chose: "${sh.name}" \u2014 ${sh.use}`);
    L.push('A paragraph of this shape has to answer these in order:');
    stepsFor(sh).forEach((st, i) => L.push(`  ${i + 1}. ${st.q}`));
    L.push('Tell them which of these the paragraph actually does, and which it skips or only gestures at.');
    L.push('');
  }
  if(a.count){
    L.push('SENTENCE CONSTRUCTION, measured from the text:');
    L.push(`  ${a.count} sentences, ${a.words} words, average ${a.avg}, shortest ${a.shortest} and longest ${a.longest}.`);
    L.push(`  Openings used: ${used || 'none detected'}.`);
    L.push(`  Punctuation: ${a.semicolons} semicolon(s), ${a.dashes} dash(es), ${a.colons} colon(s).`);
    if(untried.length) L.push(`  Openings not used at all: ${untried.join('; ')}.`);
    L.push('Comment on variety and rhythm. If one construction would suit a particular sentence, say which sentence and which construction, and let them write it.');
    L.push('');
  }
  L.push('ANSWER IN THIS ORDER:');
  L.push('1. Does the paragraph do what the shape requires? Go through the numbered jobs above.');
  L.push('2. Sentence construction: variety, length, rhythm, and anything repetitive.');
  if(lvl) L.push('3. Is the construction doing enough for this NCEA level? Say what is missing, not what to write.');
  L.push('End with two questions they could answer themselves to improve it.');
  L.push('');
  L.push('THE PARAGRAPH:');
  L.push('');
  L.push(text || '(nothing written yet)');
  return L.join('\n');
}

function openAI(key, btn){
  const site = AI_SITES.find(s => s.key === key); if(!site) return;
  /* open first, synchronously: a window.open after an await is a pop-up
     blocker's definition of unrequested */
  let w = null;
  try { w = window.open(site.url, '_blank', 'noopener'); } catch(e){}
  copy(craftPrompt(), btn, w ? 'Copied \u2014 paste it' : 'Copied');
  if(!w && btn){
    const note = btn.closest('.wr-aibar');
    if(note && !note.querySelector('.wr-aiblocked'))
      note.insertAdjacentHTML('beforeend', `<p class="wr-aiblocked">The prompt is copied. Your
        browser blocked the new tab, so open ${esc(site.name)} yourself and paste it.</p>`);
  }
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
      <div class="wr-acts">
        ${sh.example ? `<button class="wr-btn wr-ghost"
          data-wrexample="${esc(sh.id)}">See an example</button>` : ''}
        <button class="wr-btn wr-ghost" data-wrshapeopen>Change shape</button>
      </div>
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
    html += `<div class="wr-shapewrap"><button class="wr-shape${fits ? ' wr-fits' : ''}" data-wrshape="${esc(s.id)}"
        aria-pressed="${S.shape===s.id}">
      <span class="wr-shapename">${esc(s.name)}${s.also
        ? ` <em>(${esc(s.also)})</em>` : ''}${fits
        ? ' <span class="wr-rec">fits this standard</span>' : ''}${n
        ? ` <span class="wr-tally" title="paragraphs you have built this way">\u00d7${n}</span>`
        : (Object.keys(S.used || {}).length
            ? ' <span class="wr-new">not tried</span>' : '')}</span>
      <span class="wr-shapeuse">${esc(s.use)}</span>
    </button>
    </div>`;
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
    ${(() => { const a = analyse(currentText());
      return a.count >= 2 ? `<div class="wr-whole">
        <p class="wr-rh">The paragraph as a whole</p>
        <p class="wr-hint">This counts what is there \u2014 it does not judge whether the content
        is any good, because it cannot see your task or your evidence.</p>
        ${report(a)}</div>` : ''; })()}
    <div class="wr-acts">
      ${sh.example ? `<button class="wr-btn wr-ghost"
        data-wrexample="${esc(sh.id)}">See an example</button>` : ''}
      <button class="wr-btn wr-alt" data-wrcopy>Copy the paragraph</button>
      <button class="wr-btn wr-ghost" data-wrreset>Clear</button>
    </div>
    <div class="wr-aibar">
      <p class="wr-aih">Get feedback on how it is written</p>
      <p class="wr-aib">One click copies your paragraph with a prompt about
        ${lvl ? `${esc(LEVEL_NAME[lvl])} expectations, ` : ''}the shape you chose and the
        sentences you built, then opens the AI. The prompt tells it not to rewrite anything and
        not to comment on your content \u2014 it cannot see your task, so it does not know.</p>
      <div class="wr-aibtns">
        ${AI_SITES.map(x => `<button class="wr-btn wr-ai" data-wrai="${esc(x.key)}">
          Copy &amp; open ${esc(x.name)}</button>`).join('')}
      </div>
      ${S.std ? `<button class="wr-ailink" data-wrfeedback>Or copy the full
        standard-specific prompt instead</button>` : ''}
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
        ${done ? '<span class="wr-tick" aria-hidden="true">\u2713</span>' : ''}${markUp(m.label, m.mark)}
        ${m.cat === 'advanced' ? '<span class="wr-adv">advanced</span>' : ''}
      </button>
      ${open ? `<div class="wr-ideabody">
        <p class="wr-ideawhy">${esc(m.why)}</p>
        <p class="wr-ideaeg">${markUp(m.eg, m.egMark)}</p>
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
      <p class="wr-rh">Ways to build a sentence</p>
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
  const sh = shapeById(S.shape); if(!sh) return '';
  const a = S.answers[sh.id] || [];
  return stepsFor(sh).map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
}

function feedbackPrompt(){
  const text = currentText();
  const cur = S.std ? findStd(S.std.level, S.std.code) : null;
  const sh = shapeById(S.shape);
  let extra = 'This is ONE PARAGRAPH, not a whole piece of work. Comment on this paragraph only.';
  if(sh)
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
    const t = ev.target.closest('[data-wrstd],[data-wrclear],[data-wrshape],' +
      '[data-wrcopy],[data-wrfeedback],[data-wrreset],' +
      '[data-wrpick],[data-wrunpick],[data-wrnav],[data-wridea],[data-wraddframe],' +
      '[data-wrshapeopen],[data-wrshapeclose],[data-wrexample],[data-wrexclose],' +
      '[data-wrexlevel],[data-wrexback],[data-wrai],[data-wrasks]');
    if(!t) return;
    const d = t.dataset;

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
      if(S.shape) S.asksOpen = false;   // and the section above it
      save(); render(); return;
    }
    if('wrai' in d){ recordUse(S.shape); openAI(d.wrai, t); return; }
    if('wrasks' in d){ S.asksOpen = !S.asksOpen; render(); return; }
    if('wrexample' in d){ S.example = d.wrexample; S.exLevel = exampleLevel(); render(); return; }
    if('wrexclose' in d){ S.example = null; render(); return; }
    if('wrexlevel' in d){ S.exLevel = d.wrexlevel; render(); return; }
    /* clicking the backdrop itself, not the card on top of it, closes */
    if('wrexback' in d && ev.target === t){ S.example = null; render(); return; }
    if('wrshapeopen' in d){ S.shapeOpen = true; render(); return; }
    if('wrshapeclose' in d){ S.shapeOpen = false; render(); return; }
    if('wrreset' in d){ if(S.shape) delete S.answers[S.shape]; save(); render(); return; }
    /* Copying it, or sending it for feedback, is a student finishing with
       this paragraph — which is when it counts towards the tally that
       notices they have built three the same way. */
    if('wrcopy' in d){ recordUse(S.shape); copy(currentText(), t); return; }
    if('wrfeedback' in d){ recordUse(S.shape);
      copy(feedbackPrompt(), t, 'Copied — paste it into your AI'); return; }
  });

  /* The analyser reruns as they type, so only the report is redrawn —
     rebuilding the textarea would move the caret to the end. */
  r.addEventListener('input', ev => {
    const el = ev.target;
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
      const whole = r.querySelector('.wr-whole');
      const a2 = analyse(currentText());
      if(a2.count >= 2){
        const html = `<div class="wr-whole"><p class="wr-rh">The paragraph as a whole</p>
          <p class="wr-hint">This counts what is there \u2014 it does not judge whether the content
          is any good, because it cannot see your task or your evidence.</p>${report(a2)}</div>`;
        if(whole) whole.outerHTML = html;
        else { const as = r.querySelector('.wr-form .wr-acts');
               if(as) as.insertAdjacentHTML('beforebegin', html); }
      } else if(whole) whole.remove();
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
  moves: MOVES, craftPrompt, AI_SITES, exampleLevel, WRITING_STANDARDS, movesFor, liveNote, recordUse, habitNote, stepsFor, LEVEL_EXPECT, addFrame, blanksLeft, suggestedShapes,
  open: render,
  state: S,
  /* exposed so the tests can check the analyser without driving the UI */
  analyse, sentences, opener, suggestions,
  shapes: SHAPES.filter(s => s.id),
  isWriting, allWritingStandards,
  build: W_BUILD
};

})();
