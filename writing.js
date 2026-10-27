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

const W_BUILD = 'build 106 — writing tools';

const R = () => document.getElementById('writing-root');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- state ---------- */

const KEY = 'ncea_writing_v1';
/* picking is the one part of the state that is never saved: whether the
   standard list is open is a this-moment thing, not something to restore. */
let S = { std: null, shape: null, answers: {}, question: '', commands: [], level: null, plan: [], slot: null, planOpen: false, essayOpen: false,
          startOpen: false,
          picking: false, idea: null, lastStep: null, example: null, exLevel: null, asksOpen: null, headOpen: false, used: {}, recent: [], shapeOpen: false,
          nav: {} };   // where they are in the level/faculty/subject drill-down

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({
    shape: S.shape, answers: S.answers,
    question: S.question, commands: S.commands, level: S.level, plan: S.plan, slot: S.slot,
    used: S.used, recent: S.recent })); }
  catch(e){ /* private browsing or a full quota — not worth interrupting them */ }
}
function load(){
  try{
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(o){ S.shape = o.shape || null;
      S.answers = o.answers || {};
      S.question = typeof o.question === 'string' ? o.question : '';
      /* it used to be a single command word */
      S.commands = Array.isArray(o.commands) ? o.commands : (o.command ? [o.command] : []);
      S.level = ['1','2','3','S'].indexOf(o.level) >= 0 ? o.level : null;
      S.plan = Array.isArray(o.plan) ? o.plan : [];
      S.slot = o.slot || null;
      /* Answers used to be keyed by shape id. They are keyed by slot now, so
         anything written before this change would otherwise be orphaned. */
      for(const k of Object.keys(S.answers)){
        if(SHAPES.some(x => x.id === k)){
          S.answers['free:' + k] = S.answers[k];
          delete S.answers[k];
        }
      }
      S.used = (o.used && typeof o.used === 'object') ? o.used : {};
      S.recent = Array.isArray(o.recent) ? o.recent : []; }
    /* Folding is a within-session thing. Arriving at the tab, the shapes are
       the choice in front of them, so the picker opens even when last
       session's shape is still remembered. */
    S.shapeOpen = true;
    S.startOpen = false;
  }catch(e){ /* corrupt store: start clean rather than die */ }
}

const LEVEL_NAME = { '1':'Level 1', '2':'Level 2', '3':'Level 3', 'S':'Scholarship' };

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

  { id:'intro', role:'frame', name:'Opening a piece',
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

  { id:'conclusion', role:'frame', name:'Closing a piece',
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

/* ============================================================
   THE QUESTION, THE LEVEL, AND THE COMMAND WORD
   The anchor used to be the standard. It is now the question
   the student is actually answering, because a standard lists
   five or six verbs while a question has one \u2014 and that one
   decides what the paragraph has to do. The level is picked
   directly rather than inferred, so nobody has to find their
   standard before they can start writing.
   ============================================================ */

const COMMANDS = [
  { key:'describe',  label:'Describe',
    re:/\bdescrib\w*/i, shapes:['cause','claim'],
    asks:'Say what it is and what happens, in order, with detail that is specific rather than general.' },
  { key:'explain',   label:'Explain',
    re:/\bexplain\w*|\bwhy does\b|\bhow does\b/i, shapes:['cause','claim'],
    asks:'Give the mechanism. Not that something happened, but how it produced what followed.' },
  { key:'analyse',   label:'Analyse',
    re:/\banalys\w*|\banalyz\w*|\bexamin\w*/i, shapes:['angles','claim'],
    asks:'Break it into parts and show how they work on each other. A list of features is not an analysis.' },
  { key:'compare',   label:'Compare',
    re:/\bcompar\w*|\bcontrast\w*|\bsimilar\w*|\bdifferen\w*/i, shapes:['compare'],
    asks:'Put the two side by side on the same criterion, and say what the comparison itself shows.' },
  { key:'discuss',   label:'Discuss',
    re:/\bdiscuss\w*/i, shapes:['counter','angles'],
    asks:'Put more than one position on the table and weigh them. A one-sided answer does not discuss.' },
  { key:'evaluate',  label:'Evaluate',
    re:/\bevaluat\w*|\bassess\w*|\bhow (effective|successful|important)\b/i, shapes:['build','counter'],
    asks:'Judge it against a criterion you state. The criterion is as important as the verdict.' },
  { key:'critically', label:'Critically evaluate',
    re:/\bcritically\b/i, shapes:['counter','build'],
    asks:'Meet the strongest objection to your position before you give your verdict, not after.' },
  { key:'justify',   label:'Justify',
    re:/\bjustif\w*|\bdefend\b|\bargue\b/i, shapes:['build','counter'],
    asks:'Give reasons that would persuade someone who started out disagreeing with you.' },
  { key:'extent',    label:'To what extent',
    re:/\bto what extent\b|\bhow far\b/i, shapes:['counter','build'],
    asks:'The answer is a degree, not a yes or no. Say how much, and what is left over.' },
  { key:'significance', label:'Significance',
    /* "a significant historical event" is a topic, not an instruction, so this
       only fires where significance is the thing being asked about */
    re:/\bsignificance of\b|\bhow significant\b|\bhow important\b|\bwhat impact\b|\bimportance of\b/i,
    shapes:['build','angles'],
    asks:'Significant to whom, measured how, and compared with what? Say so.' }
];

/* command words in the question that the student has not ticked */
function missedCommands(){
  const picked = S.commands || [];
  if(!picked.length) return [];
  return detectedCommands().filter(c => !picked.includes(c.key));
}

/* what the question itself asks for, if they have typed one */
function detectedCommands(){
  const q = (S.question || '').trim();
  if(!q) return [];
  return COMMANDS.filter(c => c.re.test(q));
}

/* The student identifies the command words themselves \u2014 working out what a
   question is actually asking is half of answering it. What they pick wins;
   the detector is only a safety net for a student who skips the step, and a
   nudge when their question plainly uses a word they did not tick. */
function activeCommands(){
  const picked = (S.commands || []).map(k => COMMANDS.find(x => x.key === k)).filter(Boolean);
  if(picked.length) return picked;
  let found = detectedCommands();
  /* "critically evaluate" also matches "evaluate"; the narrower one wins */
  if(found.some(c => c.key === 'critically'))
    found = found.filter(c => c.key !== 'evaluate');
  /* the instruction is normally the leading verb, so order by where each
     one appears rather than by the order they happen to sit in the table */
  const q = (S.question || '');
  found = found.slice().sort((a, b) => {
    const ia = q.search(a.re), ib = q.search(b.re);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
  });
  return found.slice(0, 2);
}

/* a level chosen outright wins; a standard still implies one */
function levelOf(){ return S.level || null; }

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
  /* With no subject to read, these gate on the level alone: at Level 1 and 2
     a periodic sentence or an inversion reads as strain rather than control. */
  const lvl = levelOf();
  return MOVES.filter(m => {
    if(m.cat !== cat) return false;
    if(cat !== 'advanced') return true;
    return lvl === '3' || lvl === 'S';
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
  stopSpeech();          // the buttons below are about to be replaced
  r.innerHTML = buildPane() + foot() + exampleModal();
  wire();
}

/* There is no second tab. The whole-paragraph report used to live behind
   one; it now sits under the paragraph it describes, which is where a
   student is already looking. */

/* ============================================================
   THE ESSAY PLAN
   One paragraph at a time, the tool could not see the thing it
   exists to change: a piece of writing built from one shape
   over and over. The plan holds the whole essay \u2014 a row per
   paragraph, each with a shape and the point it has to make \u2014
   so the repetition is visible before any of it is written.

   Each row has its own id, and the sentences a student writes
   are stored against that id rather than against the shape. Two
   paragraphs can therefore use the same shape without
   overwriting one another, which free-writing could not do.
   ============================================================ */

let planSeq = 0;
const newRowId = () => 'p' + (Date.now().toString(36)) + (planSeq++).toString(36);

/* where the current paragraph's sentences live */
function slotId(){
  if(S.slot && (S.plan || []).some(r => r.id === S.slot)) return S.slot;
  return S.shape ? 'free:' + S.shape : null;
}
function slotAnswers(){
  const k = slotId();
  return k ? (S.answers[k] = S.answers[k] || []) : [];
}

function planRow(r, i){
  const sh = shapeById(r.shape);
  const a = S.answers[r.id] || [];
  const written = a.filter(x => (x || '').trim()).length;
  const total = sh ? stepsFor(sh).length : 0;
  const here = S.slot === r.id;
  return `<li class="wr-planrow${here ? ' wr-planhere' : ''}">
    <span class="wr-plannum">${i + 1}</span>
    <div class="wr-planmain">
      <select class="wr-planshape" data-wrplanshape="${esc(r.id)}">
        <option value="">Choose a shape\u2026</option>
        <optgroup label="Opening and closing" class="wr-optframe">
          ${SHAPES.filter(x => x.id && x.role === 'frame').map(x => `<option
            class="wr-optframe" value="${esc(x.id)}"
            ${x.id === r.shape ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
        </optgroup>
        <optgroup label="Body paragraphs">
          ${SHAPES.filter(x => x.id && x.role !== 'frame').map(x => `<option
            value="${esc(x.id)}"
            ${x.id === r.shape ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
        </optgroup>
      </select>
      <input class="wr-planpoint" data-wrplanpoint="${esc(r.id)}" type="text"
        value="${esc(r.point || '')}" placeholder="The point this paragraph makes">
    </div>
    <span class="wr-planstate">${sh && written
      ? `${written}/${total} written` : (sh ? 'not started' : '')}</span>
    <span class="wr-planacts">
      ${sh ? `<button class="wr-mini" data-wrplanopen="${esc(r.id)}">${here
        ? 'Writing this' : 'Write this'}</button>` : ''}
      <button class="wr-mini wr-planx" data-wrplandel="${esc(r.id)}"
        aria-label="Remove paragraph ${i + 1}">\u00d7</button>
    </span>
  </li>`;
}

function planCard(){
  const rows = S.plan || [];
  const shapesUsed = rows.filter(r => r.shape).map(r => r.shape);
  const distinct = new Set(shapesUsed).size;

  if(!S.planOpen) return `<button class="panel p-4 wr-card wr-plancard${
      rows.length ? '' : ' wr-cardempty'}" data-wrplanopenpanel>
    <p class="wr-cardlab">Essay plan <span class="wr-cardgo">${rows.length ? 'Open' : 'Start'}</span></p>
    <p class="wr-cardval">${rows.length
      ? `${rows.length} paragraph${rows.length === 1 ? '' : 's'} planned`
      : 'Plan the whole essay'}</p>
    <p class="wr-cardsub">${rows.length
      ? (shapesUsed.length
          ? `${distinct} different shape${distinct === 1 ? '' : 's'} across ${shapesUsed.length}.`
          : 'No shapes chosen yet.')
      : 'Set out the paragraphs before you write them, so you can see the whole piece at once.'}</p>
  </button>`;

  return `<div class="panel p-4 md:p-5 wr-wide wr-planpanel">
    <div class="wr-stdbar">
      <h3 class="wr-h3">Your essay plan</h3>
      <button class="wr-btn wr-ghost" data-wrplanclose>Done</button>
    </div>
    ${(S.question || '').trim()
      ? `<p class="wr-planq">${esc(S.question)}</p>` : ''}
    <p class="wr-hint">One row per paragraph. Give each the shape it needs and the point it has
      to make. Nothing here is written for you \u2014 the point is yours, in your words.</p>
    ${rows.length ? `<ol class="wr-plan">${rows.map(planRow).join('')}</ol>` : `<p class="wr-hint
      mt-2">No paragraphs yet.</p>`}
    ${shapesUsed.length >= 3 ? `<p class="wr-planshapes">Shapes in this plan:
      ${[...new Set(shapesUsed)].map(id => {
        const sh = shapeById(id);
        const c = shapesUsed.filter(x => x === id).length;
        return `<span class="wr-planchip">${esc(sh ? sh.name : id)}${c > 1
          ? ` \u00d7${c}` : ''}</span>`;
      }).join('')}</p>` : ''}
    <div class="wr-acts">
      <button class="wr-btn wr-alt" data-wrplanadd>Add a paragraph</button>
      ${rows.length ? `<button class="wr-btn wr-go" data-wressayopen>See the whole essay</button>
        <button class="wr-btn wr-ghost" data-wrplancopy>Copy the plan</button>` : ''}
    </div>
  </div>`;
}

function planText(){
  const rows = S.plan || [];
  const L = [];
  if((S.question || '').trim()) L.push('QUESTION: ' + S.question.trim(), '');
  rows.forEach((r, i) => {
    const sh = shapeById(r.shape);
    L.push(`${i + 1}. ${sh ? sh.name : '(no shape chosen)'}`);
    if((r.point || '').trim()) L.push('   ' + r.point.trim());
  });
  return L.join('\n');
}

/* The tally is kept so a shape they lean on quietly drops out of the
   recommendations. It is never shown to the student. */
function recordUse(id){
  if(!id) return;
  S.used = S.used || {};
  S.used[id] = (S.used[id] || 0) + 1;
  S.recent = [id].concat(S.recent || []).slice(0, 8);
  save();
}

/* ============================================================
   FEEDBACK WHILE THEY WRITE
   Everything here is counted, not judged. It can tell a student
   that a sentence is 44 words long, or that it opens the same
   way as the one above it, because those are facts about the
   text. It cannot tell them whether the evidence proves the
   claim \u2014 that needs a reader who knows the subject, which is
   what the AI prompt is for.
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

function prevOpenerFor(a, steps, i){
  for(let k = i - 1; k >= 0; k--){
    const t = (a[k] || '').trim();
    if(t){ const ss = sentences(t); if(ss.length) return opener(ss[ss.length - 1]); }
  }
  return null;
}

/* ---- the whole essay ----
   The plan holds the paragraphs; this is where they are read in order, as a
   piece. It is assembled from what the student wrote and nothing else: no
   joining sentences, no transitions supplied. Gaps show as gaps, because a
   missing paragraph is the thing most worth seeing. */

function paragraphOf(rowId){
  const row = (S.plan || []).find(r => r.id === rowId);
  if(!row || !row.shape) return '';
  const sh = shapeById(row.shape); if(!sh) return '';
  const a = S.answers[rowId] || [];
  return stepsFor(sh).map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
}

function essayText(){
  const L = [];
  if((S.question || '').trim()) L.push(S.question.trim(), '');
  for(const r of (S.plan || [])){
    const t = paragraphOf(r.id);
    if(t) L.push(t, '');
  }
  return L.join('\n').trim();
}

function essayPanel(){
  const rows = S.plan || [];
  const written = rows.filter(r => paragraphOf(r.id));
  const words = wordCount(rows.map(r => paragraphOf(r.id)).join(' '));
  return `<div class="panel p-4 md:p-5 wr-wide wr-essay">
    <div class="wr-stdbar">
      <h3 class="wr-h3">The whole essay</h3>
      <button class="wr-btn wr-ghost" data-wressayclose>Back to the plan</button>
    </div>
    <p class="wr-hint">Your paragraphs in the order you planned them. Nothing has been added
      between them \u2014 the joins are yours to write.</p>
    <p class="wr-essaystat">
      ${speakerBtn('essay', 'Read the whole essay aloud')}
      <span class="wr-count wr-words">${words} word${words === 1 ? '' : 's'}</span>
      <span class="wr-count">${written.length} of ${rows.length} paragraph${
        rows.length === 1 ? '' : 's'} written</span>
    </p>
    ${(S.question || '').trim() ? `<p class="wr-planq">${esc(S.question)}</p>` : ''}
    ${rows.length ? `<div class="wr-essaybody">${rows.map((r, i) => {
      const sh = shapeById(r.shape);
      const t = paragraphOf(r.id);
      return `<div class="wr-essaypara${t ? '' : ' wr-essaygap'}">
        <p class="wr-essaylab"><span class="wr-plannum">${i + 1}</span>
          ${esc(sh ? sh.name : 'No shape chosen')}${(r.point || '').trim()
            ? ` \u00b7 ${esc(r.point)}` : ''}</p>
        ${t ? `<p class="wr-para">${esc(t)}</p>`
            : `<p class="wr-essaynone">Not written yet.
                <button class="wr-mini" data-wrplanopen="${esc(r.id)}">Write it</button></p>`}
      </div>`;
    }).join('')}</div>` : `<p class="wr-hint mt-2">No paragraphs planned yet.</p>`}
    <div class="wr-acts">
      <button class="wr-btn wr-alt" data-wressaycopy>Copy the whole essay</button>
    </div>
  </div>`;
}

/* ---- where a student starts ----
   Three level tabs and the question. Everything else that used to sit up
   here \u2014 the explainer, the standard chooser, the band-shift panel \u2014 was
   reading, not doing. The question is the only thing the tool needs, and the
   level is one click. */

function startCard(){
  const lvl = levelOf();
  const q = (S.question || '').trim();
  const cmds = activeCommands();

  if(!S.startOpen && S.shape) return `<button class="panel p-4 wr-card wr-startcard"
      data-wrstart>
    <p class="wr-cardlab">${lvl ? esc(LEVEL_NAME[lvl]) : 'No level set'}
      <span class="wr-cardgo">Change</span></p>
    <p class="wr-cardval">${cmds.length ? esc(cmds[0].label) : 'Your question'}</p>
    <p class="wr-cardsub">${q
      ? esc(q.length > 120 ? q.slice(0, 120) + '\u2026' : q)
      : 'No question added yet.'}</p>
    <p class="wr-cardnote">How you write it, not what you write.</p>
  </button>`;

  return `<div class="panel p-4 md:p-5 wr-start">
    <p class="wr-strap">This is about <strong>how</strong> you write, not what you write.
      It never judges your content or your evidence \u2014 it cannot see your task \u2014 and it
      never writes a sentence for you.</p>
    <div class="wr-startrow">
      <div class="seg wr-lvlseg">
        ${['1','2','3'].map(l => `<button data-wrlvl="${l}"
          aria-pressed="${lvl === l}">Level ${l}</button>`).join('')}
      </div>
      ${S.shape ? '<button class="wr-btn wr-ghost" data-wrstartclose>Done</button>' : ''}
    </div>
    ${lvl && LEVEL_EXPECT[lvl] ? `<p class="wr-startlvl">${esc(LEVEL_EXPECT[lvl].line)}</p>` : ''}

    <label class="wr-startq" for="wr-q">What question are you answering?</label>
    <textarea id="wr-q" class="wr-in" data-wrq rows="2"
      placeholder="Paste your essay or paragraph question here">${esc(S.question || '')}</textarea>

    <p class="wr-cmdq">Which command words does it use?
      <span class="wr-cmdqsub">Pick every one that applies \u2014 questions often use more
      than one, and each adds something the paragraph has to do.</span></p>
    <div class="wr-cmds">${COMMANDS.map(c => `<button class="wr-cmd"
      data-wrcmd="${esc(c.key)}"
      aria-pressed="${(S.commands || []).includes(c.key)}">${esc(c.label)}</button>`
      ).join('')}${(S.commands || []).length
        ? '<button class="wr-cmd wr-cmdclear" data-wrcmd="">Clear all</button>' : ''}</div>

    ${cmds.length ? `<div class="wr-cmdfound">
      <p class="wr-cardlab">${(S.commands || []).length
        ? 'So this paragraph has to' : 'Nothing picked yet, so going on the question alone'}</p>
      ${cmds.map(c => `<p class="wr-cmdname">${esc(c.label)}</p>
        <p class="wr-cmdasks">${esc(c.asks)}</p>`).join('')}
    </div>` : `<p class="wr-hint mt-2 wr-cmdnone">Pick the command words above and the shapes
      will follow them.</p>`}
    ${missedCommands().length ? `<p class="wr-cmdmiss">Your question also uses
      <strong>${missedCommands().map(c => esc(c.label)).join('</strong> and <strong>')}</strong>.
      Worth a look before you start.</p>` : ''}
  </div>`;
}

/* ---- reading it aloud ----
   Hearing a paragraph read back catches what the eye skips: a sentence with
   no air in it, three openings the same, a clause that cannot be said in one
   breath. It runs on the browser's own speech synthesiser, so nothing is
   sent anywhere, and it is simply absent on a browser that has none. */

const canSpeak = () => typeof window !== 'undefined'
  && typeof window.speechSynthesis !== 'undefined'
  && typeof window.SpeechSynthesisUtterance !== 'undefined';

let speaking = null;        // the id of whatever is being read, or null
let speechFailed = false;   // set once, if the browser has no voice to use

function stopSpeech(){
  if(!canSpeak()) return;
  try { window.speechSynthesis.cancel(); } catch(e){}
  speaking = null;
}

function speak(id, text){
  if(!canSpeak()) return;
  const was = speaking;
  stopSpeech();
  if(was === id || !String(text || '').trim()){ paintSpeakers(); return; }
  try {
    const u = new window.SpeechSynthesisUtterance(String(text));
    u.lang = 'en-NZ';
    u.rate = 0.95;            // a shade under natural, so clauses land
    u.onend = () => { speaking = null; paintSpeakers(); };
    /* No voice installed is the common case on a locked-down school machine.
       Silence with a button that flicks back tells them nothing, so say it. */
    u.onerror = () => { speaking = null; speechFailed = true; paintSpeakers(); };
    speaking = id;
    window.speechSynthesis.speak(u);
  } catch(e){ speaking = null; }
  paintSpeakers();
}

/* the buttons are repainted rather than re-rendered, so nothing the student
   has typed is disturbed while the speech is running */
function paintSpeakers(){
  const r = R(); if(!r) return;
  r.querySelectorAll('[data-wrspeak]').forEach(b => {
    const on = speaking === b.dataset.wrspeak;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = on ? '\u25a0 Stop' : '\u25b6 Read aloud';
    b.classList.toggle('wr-speakoff', speechFailed);
    if(speechFailed) b.title = 'This device has no voice installed, so it cannot read aloud';
  });
  if(speechFailed) r.querySelectorAll('[data-wrspeak]').forEach(b => {
    const host = b.parentElement;
    if(host && !host.querySelector('.wr-speakerr'))
      host.insertAdjacentHTML('beforeend',
        ' <span class="wr-speakerr">no voice installed on this device</span>');
  });
}

const speakerBtn = (id, label) => canSpeak()
  ? `<button class="wr-speak" data-wrspeak="${esc(id)}" aria-pressed="false"
      title="${esc(label)}">\u25b6 Read aloud</button>` : '';

/* ---- which shapes to put in front of them ---- */

function suggestedShapes(){
  const out = [];
  /* the question's own command word: one verb, and the one that counts */
  for(const c of activeCommands()) for(const id of c.shapes)
    if(!out.includes(id)) out.push(id);

  /* at Level 3 the judgement shapes are worth putting in front of everyone,
     because judgement is what the level is marked on */
  const lvl = levelOf();
  if(lvl === '3' || lvl === 'S')
    for(const id of ['build','counter']) if(!out.includes(id)) out.push(id);

  /* a shape they already lean on is not a recommendation, it is a rut */
  const used = S.used || {};
  const lean = Object.keys(used).filter(k => used[k] >= 3);
  let fresh = out.filter(id => !lean.includes(id));
  if(!fresh.length)
    fresh = SHAPES.filter(x => x.id && x.role !== 'frame' && !used[x.id])
                  .map(x => x.id);
  return (fresh.length ? fresh : out).slice(0, 4);
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
      <p class="wr-exread">${speakerBtn('example', 'Read this example aloud')}</p>
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
  const cmds = activeCommands();
  if((S.question || '').trim()){
    L.push('THE QUESTION THEY ARE ANSWERING:');
    L.push(S.question.trim());
    if(cmds.length) L.push(`Its command word is "${cmds[0].label}" \u2014 ${cmds[0].asks}`);
    L.push('Judge the paragraph against what that command word requires, not against the topic.');
    L.push('');
  }
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

/* window.open(url, '_blank', 'noopener') returns null BY SPEC \u2014 noopener
   severs the handle \u2014 so testing its return value reported every successful
   tab as blocked. An anchor with rel="noopener" opens the tab just as safely
   and leaves nothing ambiguous to test. */
function openSite(key){
  const site = AI_SITES.find(s => s.key === key); if(!site) return;
  const a = document.createElement('a');
  a.href = site.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---- build pane ---- */

function buildPane(){
  /* The three orientation panels sit in one row while they are folded, and
     the one that opens spans the row rather than pushing the others around. */
  if(S.essayOpen) return `<div class="wr-top">${essayPanel()}</div>` +
    `<div class="wr-work"><div class="wr-main">${shapePicker()}${S.shape ? shapeForm() : ''}</div>` +
    ideasRail() + `</div>`;
  return `<div class="wr-top">${startCard()}${planCard()}</div>` +
    `<div class="wr-work"><div class="wr-main">${shapePicker()}${S.shape ? shapeForm() : ''}</div>` +
    ideasRail() + `</div>`;
}

function shapePicker(){
  /* Once they have chosen, nine tiles are just something to scroll past, so
     the picker folds to a line. Reopening is one click and nothing is lost. */
  if(S.shape && !S.shapeOpen){
    const sh = shapeById(S.shape);
    return `<div class="panel p-4 wr-stdbar wr-chosen">
      <div>
        <p class="wr-stdlab">Paragraph shape</p>
        <p class="wr-stdname"><strong>${esc(sh.name)}</strong>${sh.also
          ? ` <em>(${esc(sh.also)})</em>` : ''}</p>
        <p class="wr-stdsub">${esc(sh.use)}</p>
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
    html += `<div class="wr-shapewrap"><button class="wr-shape${fits ? ' wr-fits' : ''}" data-wrshape="${esc(s.id)}"
        aria-pressed="${S.shape===s.id}">
      <span class="wr-shapename">${esc(s.name)}${s.also
        ? ` <em>(${esc(s.also)})</em>` : ''}${fits
        ? ` <span class="wr-rec">${activeCommands().length ? 'suits your question'
            : 'suits this level'}</span>` : ''}</span>
      <span class="wr-shapeuse">${esc(s.use)}</span>
    </button>
    ${s.example ? `<button class="wr-exmini" data-wrexample="${esc(s.id)}"
      title="A worked paragraph in this shape">See an example</button>` : ''}</div>`;
  }
  if(open) html += '</div>';
  return `<div class="panel p-4 md:p-5">
    <div class="wr-stdbar">
      <h3 class="wr-h3">What shape does this paragraph need?</h3>
      ${S.shape ? '<button class="wr-btn wr-ghost" data-wrshapeclose>Close</button>' : ''}
    </div>
    ${rec.length ? `<p class="wr-hint">${(() => {
      const c = activeCommands()[0];
      if(c) return `Marked ones suit a <strong>${esc(c.label)}</strong> question \u2014 a
        starting point, not a rule.`;
      return `Marked ones suit the level you chose \u2014 a starting point, not a rule.`;
    })()}</p>` : ''}
    ${html}
  </div>`;
}

function shapeForm(){
  const sh = shapeById(S.shape); if(!sh) return '';
  const a = slotAnswers();
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
      <p class="wr-alabel">${speakerBtn('para', 'Read your paragraph aloud')}Your paragraph so far${(() => {
        const joined = steps.map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
        const w = wordCount(joined);
        const b = blanksLeft(joined);
        return (w ? ` <span class="wr-count wr-words">${w} word${w===1?'':'s'}</span>` : '')
          + (b ? ` <span class="wr-count wr-blanks">${b} gap${b===1?'':'s'} still to fill</span>` : '');
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
      <p class="wr-aib">Copy your paragraph together with a prompt about
        ${lvl ? `${esc(LEVEL_NAME[lvl])} expectations, ` : ''}the shape you chose and the
        sentences you built. The prompt tells the AI not to rewrite anything and not to comment
        on your content \u2014 it cannot see your task, so it does not know.</p>
      <div class="wr-aibtns">
        <button class="wr-btn wr-ai" data-wrcraft>Copy my paragraph and the prompt</button>
      </div>
      <p class="wr-aithen">Then open <span class="wr-aisites">${AI_SITES.map(x =>
        `<button class="wr-aisite" data-wrai="${esc(x.key)}">${esc(x.name)}</button>`
        ).join('')}</span> and paste it in.</p>
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

  const row = m => {
    const done = m.cat === 'opener' && used(m.key);
    const open = S.idea === m.key;
    return `<div class="wr-idea${done ? ' wr-done' : ''}${open ? ' wr-ideaopen' : ''}">
      <button class="wr-ideab" data-wridea="${esc(m.key)}" aria-expanded="${open}">
        ${done ? '<span class="wr-tick" aria-hidden="true">\u2713</span>' : ''}${markUp(m.label, m.mark)}
        ${m.cat === 'advanced' ? '<span class="wr-adv">advanced</span>' : ''}
      </button>
      ${open ? `<div class="wr-ideabody">
        <button class="wr-ideaclose" data-wridea="${esc(m.key)}"
          aria-label="Close ${esc(m.label)}">\u00d7 Close</button>
        <p class="wr-ideawhy">${esc(m.why)}</p>
        <p class="wr-ideaeg">${markUp(m.eg, m.egMark)}</p>
        <button class="wr-btn wr-alt wr-ideaadd" data-wraddframe="${esc(m.key)}">Add the frame</button>
        <p class="wr-ideaframe"><code>${esc(m.frame)}</code></p>
      </div>` : ''}
    </div>`;
  };

  return `<aside class="wr-rail"><div class="wr-railin">
    <p class="wr-railh">Sentence ideas</p>
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
  const a = slotAnswers();
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

    ${/* A sentence-by-sentence table repeated, for every sentence, exactly what
          the note under each box already says; and a list of constructions
          not used duplicated the rail sitting beside it. Both are gone. What
          is left is the only thing here the student cannot see elsewhere:
          the paragraph taken as a whole. */''}
    ${suggestions(a).filter(s => !s.moves).map(s =>
      `<div class="wr-sug"><p class="wr-sugh">${esc(s.head)}</p>
        <p class="wr-sugb">${s.body}</p></div>`).join('')}
  </div>`;
}

function foot(){
  return `<p class="wr-promise"><strong>Nothing here writes a sentence for you.</strong>
    It asks the questions and counts what is there. The sentence ideas can drop in a skeleton
    with the gaps marked, but you fill every gap \u2014 every word in your paragraph is yours,
    which is the only way it can be handed in.</p>
    <p class="wr-build">${W_BUILD} · the paragraph shapes are classical rhetoric,
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
  const a = slotAnswers();
  return stepsFor(sh).map((_, i) => (a[i] || '').trim()).filter(Boolean).join(' ');
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
    const t = ev.target.closest('[data-wrshape],[data-wrcopy],[data-wrreset],' +
      '[data-wridea],[data-wraddframe],' +
      '[data-wrshapeopen],[data-wrshapeclose],[data-wrexample],[data-wrexclose],' +
      '[data-wrexlevel],[data-wrexback],[data-wrai],[data-wrcraft],' +
      '[data-wrspeak],[data-wrstart],[data-wrstartclose],' +
      '[data-wrcmd],[data-wrlvl],' +
      '[data-wrplanopenpanel],[data-wrplanclose],[data-wrplanadd],[data-wrplandel],' +
      '[data-wrplanopen],[data-wrplancopy],[data-wressayopen],[data-wressayclose],' +
      '[data-wressaycopy]');
    if(!t) return;
    const d = t.dataset;

    if('wridea' in d){ S.idea = S.idea === d.wridea ? null : d.wridea; render(); return; }
    if('wraddframe' in d){ addFrame(d.wraddframe); return; }
    if('wrshape' in d){
      S.shape = S.shape === d.wrshape ? null : d.wrshape;
      S.slot = null;                // picked by hand, so not a plan row
      S.shapeOpen = false;          // chosen, so fold the picker away
      if(S.shape) S.startOpen = false;   // and the panel above it
      save(); render(); return;
    }
    if('wrcraft' in d){ recordUse(S.shape);
      copy(craftPrompt(), t, 'Copied \u2014 now open one below'); return; }
    if('wrai' in d){ openSite(d.wrai); return; }
    if('wressayopen' in d){ S.essayOpen = true; S.planOpen = false; render(); return; }
    if('wressayclose' in d){ S.essayOpen = false; S.planOpen = true; render(); return; }
    if('wressaycopy' in d){ copy(essayText(), t); return; }
    if('wrplanopenpanel' in d){ S.planOpen = true; render(); return; }
    if('wrplanclose' in d){ S.planOpen = false; render(); return; }
    if('wrplanadd' in d){ S.plan = (S.plan || []).concat([{ id: newRowId(), shape:'', point:'' }]);
      save(); render(); return; }
    if('wrplandel' in d){
      S.plan = (S.plan || []).filter(r => r.id !== d.wrplandel);
      delete S.answers[d.wrplandel];
      if(S.slot === d.wrplandel) S.slot = null;
      save(); render(); return;
    }
    if('wrplanopen' in d){
      const row = (S.plan || []).find(r => r.id === d.wrplanopen);
      if(row && row.shape){ S.slot = row.id; S.shape = row.shape;
        S.shapeOpen = false; S.planOpen = false; S.essayOpen = false; S.startOpen = false; }
      save(); render(); return;
    }
    if('wrplancopy' in d){ copy(planText(), t); return; }
    if('wrcmd' in d){
      const k = d.wrcmd;
      if(!k) S.commands = [];
      else {
        S.commands = S.commands || [];
        S.commands = S.commands.includes(k)
          ? S.commands.filter(x => x !== k) : S.commands.concat([k]);
      }
      save(); render(); return;
    }
    if('wrlvl' in d){ S.level = S.level === d.wrlvl ? null : d.wrlvl; save(); render(); return; }
    if('wrstart' in d){ S.startOpen = true; render(); return; }
    if('wrstartclose' in d){ S.startOpen = false; render(); return; }
    if('wrspeak' in d){
      const sh2 = shapeById(S.shape);
      if(d.wrspeak === 'essay') speak('essay', essayText());
      else if(d.wrspeak === 'para') speak('para', currentText());
      else if(sh2 && sh2.example){
        const lvl2 = exampleLocked() ? exampleLevel() : (S.exLevel || exampleLevel());
        const ex2 = S.example ? shapeById(S.example) : sh2;
        const parts2 = (ex2.example.byLevel[lvl2] || ex2.example.byLevel['2']);
        speak('example', parts2.join(' '));
      }
      return;
    }
    if('wrexample' in d){ S.example = d.wrexample; S.exLevel = exampleLevel(); render(); return; }
    if('wrexclose' in d){ S.example = null; render(); return; }
    if('wrexlevel' in d){ S.exLevel = d.wrexlevel; render(); return; }
    /* clicking the backdrop itself, not the card on top of it, closes */
    if('wrexback' in d && ev.target === t){ S.example = null; render(); return; }
    if('wrshapeopen' in d){ S.shapeOpen = true; render(); return; }
    if('wrshapeclose' in d){ S.shapeOpen = false; render(); return; }
    if('wrreset' in d){ const k = slotId(); if(k) delete S.answers[k]; save(); render(); return; }
    /* Copying it, or sending it for feedback, is a student finishing with
       this paragraph — which is when it counts towards the tally that
       notices they have built three the same way. */
    if('wrcopy' in d){ recordUse(S.shape); copy(currentText(), t); return; }
  });

  /* The analyser reruns as they type, so only the report is redrawn —
     rebuilding the textarea would move the caret to the end. */
  /* the plan's dropdowns are change events, not input */
  r.addEventListener('change', ev => {
    const el = ev.target;
    if(el.dataset && el.dataset.wrplanshape !== undefined){
      const row = (S.plan || []).find(x => x.id === el.dataset.wrplanshape);
      if(row){ row.shape = el.value; save(); render(); }
      return;
    }
  });

  r.addEventListener('input', ev => {
    const el = ev.target;
    if(el.dataset && el.dataset.wrplanpoint !== undefined){
      const row = (S.plan || []).find(x => x.id === el.dataset.wrplanpoint);
      if(row){ row.point = el.value; save(); }   // no re-render: keep the caret
      return;
    }
    if(el.dataset && el.dataset.wrq !== undefined){
      S.question = el.value; save();
      /* redraw only what the question feeds, so the caret stays put */
      /* a full redraw would move the caret, so just the parts the question
         feeds: the reading of it, and the nudge about words not ticked */
      const miss = r.querySelector('.wr-cmdmiss');
      if(miss) miss.remove();
      const m2 = missedCommands();
      if(m2.length){
        const cmds2 = r.querySelector('.wr-cmds');
        if(cmds2) cmds2.insertAdjacentHTML('afterend', `<p class="wr-cmdmiss">Your question also
          uses <strong>${m2.map(c => esc(c.label)).join('</strong> and <strong>')}</strong>.
          Worth a look before you start.</p>`);
      }
      const found = r.querySelector('.wr-cmdfound');
      const none = r.querySelector('.wr-cmdnone');
      const cmds = activeCommands();
      const html = cmds.length ? `<div class="wr-cmdfound">
        <p class="wr-cardlab">This question asks you to</p>
        ${cmds.map(c => `<p class="wr-cmdname">${esc(c.label)}</p>
          <p class="wr-cmdasks">${esc(c.asks)}</p>`).join('')}</div>` : '';
      if(found){ if(html) found.outerHTML = html; else found.remove(); }
      else if(html) el.insertAdjacentHTML('afterend', html);
      /* the "nothing spotted" line and the found block are alternatives, so
         one of them always has to go */
      if(html && none) none.remove();
      if(!html && !none) el.insertAdjacentHTML('afterend',
        `<p class="wr-hint mt-2 wr-cmdnone">No command word spotted yet. Pick the one your
          question uses and the shapes below will follow it.</p>`);
      return;
    }
    if(el.dataset && el.dataset.wrstep !== undefined && S.shape){
      const i = +el.dataset.wrstep;
      const a = slotAnswers();
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
      /* rebuild only the gap counter: rewriting the whole label would take
         the read-aloud button with it on every keystroke */
      const lab = r.querySelector('.wr-alabel');
      if(lab){
        const joined = steps.map((_, k) => (a[k] || '').trim()).filter(Boolean).join(' ');
        const wc = wordCount(joined);
        const b = blanksLeft(joined);
        /* replace only the counters: rewriting the label would take the
           read-aloud button with it on every keystroke */
        const oldW = lab.querySelector('.wr-words'); if(oldW) oldW.remove();
        const oldB = lab.querySelector('.wr-blanks'); if(oldB) oldB.remove();
        if(wc) lab.insertAdjacentHTML('beforeend',
          ` <span class="wr-count wr-words">${wc} word${wc===1?'':'s'}</span>`);
        if(b) lab.insertAdjacentHTML('beforeend',
          ` <span class="wr-count wr-blanks">${b} gap${b===1?'':'s'} still to fill</span>`);
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
  moves: MOVES, essayText, paragraphOf, planText, slotId, COMMANDS, detectedCommands, activeCommands, missedCommands, levelOf, speak, stopSpeech, canSpeak, craftPrompt, AI_SITES, openSite, exampleLevel, movesFor, liveNote, recordUse, stepsFor, LEVEL_EXPECT, addFrame, blanksLeft, suggestedShapes,
  open: render,
  state: S,
  /* exposed so the tests can check the analyser without driving the UI */
  analyse, sentences, opener, suggestions,
  shapes: SHAPES.filter(s => s.id),
  build: W_BUILD
};

})();
