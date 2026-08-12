/* ============================================================
   NEW ZEALAND SCHOLARSHIP — performance standards
   Loaded on demand by whs-ncea-engine.html.

   Scholarship is not "harder Level 3". There are no credits, no
   internals, and no Achieved/Merit/Excellence. Each subject has
   ONE performance standard assessed by a single three-hour
   examination, graded Scholarship or Outstanding Scholarship,
   and awarded to roughly the top 3% of Level 3 candidates in
   that subject.

   NZQA describes what is being assessed as high-level
   "integration, synthesis, and application of highly developed
   knowledge, skills, and understanding to complex situations".
   The teaching prompts are built around that sentence.

   Students sitting Scholarship should use the Level 3 tab for
   content and this tab for the extra demand on top.

   verified:true = subject and performance standard confirmed
   against the NZQA Scholarship subject pages.
   ============================================================ */
(function () {

const FACULTIES = [
 { name:'Social Sciences', dark:'#7900CC', light:'#F5EFFF', subjects:['Geography','History','Classical Studies'] },
 { name:'Science',         dark:'#007040', light:'#E4F4E5', subjects:['Biology','Chemistry','Physics'] },
 { name:'Maths',           dark:'#9F1559', light:'#F8E7EE', subjects:['Calculus','Statistics'] },
 { name:'English',         dark:'#22229D', light:'#EBF5FA', subjects:['English'] },
 { name:'Arts',            dark:'#9A6300', light:'#FFF7EE', subjects:['Drama'] }
];

/* Shared wording. Scholarship criteria are common across subjects —
   the difference between subjects is the CONTENT, not the demand. */
const SCHOL = {
  criteria: {
    achieved:'(Scholarship has no Achieved band. The entry point is a candidate who already performs at Excellence across Level 3 in this subject.)',
    merit:'SCHOLARSHIP — sustained high-level critical thinking, abstraction and generalisation. You integrate knowledge from across the subject, apply it to complex and unfamiliar situations, and argue a position with precision and independence.',
    excellence:'OUTSTANDING SCHOLARSHIP — the same, held at a higher level throughout: genuine originality of insight, complete command of the material, and an argument that reads as convincing rather than merely correct.'
  },
  format:'One three-hour written examination in the November examination period. There are no internals and no credits. Graded Scholarship or Outstanding Scholarship, awarded to approximately the top 3% of Level 3 candidates in the subject. Check the current assessment specification on the NZQA Scholarship subject page — several subjects now offer a digital option.'
};

const SUBJECTS = {

'Biology':{
  lens:'Scholarship Biology asks you to integrate ecological, genetic and evolutionary thinking into a single extended answer, usually about material you have never seen before.',
  discipline:'Biology at this level reasons across scales and across time. The best answers move fluently between molecule, organism, population and ecosystem, and treat evolution as the explanation underlying all of it.',
  standards:[{ code:'93101', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Biology',
    bigIdea:'Take unfamiliar biological material and build one sustained argument from it, using everything you know about ecology, genetics and evolution together.',
    format:'Three-hour examination. The 2026 specification sets THREE questions, all of which should be attempted, requiring analysis of biological contexts and the use of ecological, genetic and evolutionary concepts integrated into an extended answer. The curriculum examined includes Biology achievement objectives up to and including Level 8 of the New Zealand Curriculum. A digital option is available — check the current specification.',
    evidence:'Named organisms, real data read from the supplied resource, correct terminology, and explicit links between the levels of biological organisation.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: stop answering the question in the terms it was asked and start bringing in evidence from across the subject. A Level 3 Excellence answer explains one mechanism comprehensively; a Scholarship answer explains how three mechanisms interact and what that predicts.',
      mToE:'From Scholarship to Outstanding: sustain that across the whole paper rather than in your best question, and reach a conclusion the examiner had not already framed for you.'},
    verbs:['integrate','analyse','synthesise','evaluate','justify','predict'],
    topics:['Integrating ecology, genetics and evolution','Interpreting unfamiliar biological data','Adaptation and selection pressure','Population genetics','Speciation and phylogeny','Homeostasis and physiological trade-offs','Ecological interactions and change','Building an extended biological argument'],
    contexts:['Unfamiliar biological contexts supplied in the examination'],
    misconceptions:['Treating Scholarship as more content. It is the same curriculum, examined for integration rather than recall.',
      'Answering three questions as three separate essays with no shared thread.',
      'Reaching for a memorised case study rather than working from the material supplied.',
      'Describing the biology thoroughly and never taking a position.'],
    pitfalls:['Attempting fewer than all three questions when the specification says all should be attempted.',
      'Time mismanaged, leaving the last question thin — Scholarship answers are long.',
      'Terminology used loosely, which reads as imprecision at this level.',
      'No engagement with the resource material provided.'] }]},

'Chemistry':{
  lens:'Scholarship Chemistry rewards moving between the particle, the equation and the observable — and reasoning quantitatively about systems that have not been set up neatly for you.',
  discipline:'Chemistry at this level is about mechanism and quantity together. Show what the particles are doing, support it with the maths, and be explicit about the assumptions your model makes.',
  standards:[{ code:'93102', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Chemistry',
    bigIdea:'Apply chemical reasoning to unfamiliar, multi-step problems where the route to the answer is not signposted.',
    format:'Three-hour examination. Check the current NZQA specification for the number of questions and any digital option.',
    evidence:'Full working with units and appropriate significant figures, balanced equations, structures drawn unambiguously, and assumptions stated.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: handle problems with no stated method. A Level 3 question tells you which principle to apply; a Scholarship question requires you to work out which of several applies, and to justify that choice.',
      mToE:'From Scholarship to Outstanding: be right AND economical — the shortest correct route, with the reasoning visible and the limits of the model acknowledged.'},
    verbs:['apply','derive','justify','evaluate','predict','integrate'],
    topics:['Multi-step quantitative problems','Equilibrium in unfamiliar systems','Thermodynamics and spontaneity','Organic reaction pathways and mechanism','Structure, bonding and property prediction','Redox and electrochemistry','Spectroscopic deduction','Stating and testing assumptions'],
    contexts:['Unfamiliar chemical systems supplied in the examination'],
    misconceptions:['Believing Scholarship needs content beyond Level 3. It needs deeper use of the same content.',
      'Reaching for a formula before working out what is actually happening.',
      'Treating an assumption as a weakness to hide rather than something to state and justify.'],
    pitfalls:['Working omitted, so a correct answer cannot be credited fully.',
      'Units and significant figures neglected under time pressure.',
      'A model applied outside the conditions where it holds.',
      'Answers that give the result without the reasoning.'] }]},

'Physics':{
  lens:'Scholarship Physics asks you to build a model of an unfamiliar situation, defend the model, then do the mathematics — in that order.',
  discipline:'Physics at this level rewards the physical argument as much as the algebra. Name the principle, justify why it applies, state your assumptions, then calculate — and say what the answer means.',
  standards:[{ code:'93103', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Physics',
    bigIdea:'Model situations you have never met, using principles you have, and defend every step of the reasoning.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and any digital option.',
    evidence:'A stated principle, a clear diagram, assumptions made explicit, working with units, and a physical interpretation of the result.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: combine principles that are taught separately. A Scholarship question typically needs conservation, dynamics and a materials or wave property all at once, with no indication of which to use.',
      mToE:'From Scholarship to Outstanding: check your own answer for physical sense, comment on limiting cases, and say what would change if an assumption failed.'},
    verbs:['model','derive','apply','justify','evaluate','estimate'],
    topics:['Modelling unfamiliar situations','Combining conservation laws with dynamics','Estimation and order-of-magnitude reasoning','Limiting cases and sanity checks','Oscillations and waves','Fields and circuits','Modern physics in context','Stating assumptions and their consequences'],
    contexts:['Unfamiliar physical situations supplied in the examination'],
    misconceptions:['Starting with an equation rather than a model of the situation.',
      'Believing a numerical answer completes the question — the interpretation is part of it.',
      'Treating an estimation question as an invitation to guess rather than to reason.'],
    pitfalls:['No diagram, so an unstated assumption goes unnoticed.',
      'Assumptions used but never declared.',
      'Algebra correct and the physical meaning never stated.',
      'Time spent on the familiar question at the expense of the unfamiliar one.'] }]},

'Calculus':{
  lens:'Scholarship Calculus is about mathematical argument. Getting the answer is necessary and not sufficient — the marks are in the proof.',
  discipline:'At this level mathematics is written, not just computed. Every step follows from the last for a stated reason, and a generalisation is worth more than a particular case.',
  standards:[{ code:'93202', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Calculus',
    bigIdea:'Construct and communicate rigorous mathematical arguments about problems with no obvious method.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and permitted technology.',
    evidence:'A complete logical chain with each step justified, notation used correctly, and the result generalised where possible.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: prove rather than solve. A Level 3 question asks for the answer; a Scholarship question asks you to show it holds in general, and rewards the elegance of the route.',
      mToE:'From Scholarship to Outstanding: find the insight that makes the problem simple, and communicate it so cleanly the reader sees it too.'},
    verbs:['prove','derive','generalise','justify','construct','evaluate'],
    topics:['Constructing a proof','Complex numbers and De Moivre','Differentiation and integration techniques','Differential equations','Sequences, series and convergence','Conics and analytic geometry','Modelling with calculus','Communicating a mathematical argument'],
    contexts:['Unfamiliar mathematical problems supplied in the examination'],
    misconceptions:['Believing a worked example for three cases proves the general result.',
      'Treating notation as decoration rather than as part of the argument.',
      'Assuming a calculator result can stand in for a derivation.'],
    pitfalls:['Steps skipped, so the argument cannot be followed.',
      'A correct answer with no justification, which earns very little here.',
      'Poor communication — Scholarship explicitly rewards how clearly you write mathematics.',
      'Not attempting the hardest question at all.'] }]},

'Statistics':{
  lens:'Scholarship Statistics rewards statistical thinking over statistical procedure: what the data can support, what it cannot, and how confident you are entitled to be.',
  discipline:'Statistics at this level is argument under uncertainty. Every conclusion is bounded by how the data were gathered, and saying clearly what you cannot conclude is part of the answer.',
  standards:[{ code:'93201', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Statistics',
    bigIdea:'Reason critically about real statistical situations, including the ones where the honest answer is that the data will not bear the claim.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and permitted technology.',
    evidence:'Analysis carried out correctly, conclusions written in context, and the limitations of the design and the data addressed explicitly.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: critique the study, not just the numbers. A Scholarship answer questions the sampling, the measurement and the inference before it trusts the result.',
      mToE:'From Scholarship to Outstanding: integrate the statistical reasoning and the real context so completely that the two cannot be separated.'},
    verbs:['analyse','critique','infer','justify','evaluate','communicate'],
    topics:['Critiquing study design','Sampling and its consequences','Inference and its limits','Probability and distributions in context','Experiments versus observational studies','Bias and confounding','Simulation and resampling','Communicating uncertainty honestly'],
    contexts:['Real statistical situations and reports supplied in the examination'],
    misconceptions:['Believing more sophisticated technique beats clearer thinking.',
      'Treating a statistically significant result as an important one.',
      'Answering about the numbers rather than about the situation the numbers describe.'],
    pitfalls:['Conclusions written without context.',
      'Limitations mentioned as a closing sentence rather than integrated into the argument.',
      'Analysis performed correctly on a question the data cannot answer.',
      'Claims stronger than the design supports.'] }]},

'English':{
  lens:'Scholarship English rewards an original, sustained argument about texts, written with control — the closest secondary equivalent to undergraduate literary criticism.',
  discipline:'English at this level argues from the text and from a position. The reading has to be yours, defended with precise evidence, and expressed in prose that is itself worth reading.',
  standards:[{ code:'93001', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship English',
    bigIdea:'Make an argument about literature that is genuinely your own, and sustain it with precision across a full essay.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure, the texts permitted and any digital option.',
    evidence:'Precisely chosen short quotation, close attention to the writer\u2019s craft, and wide connection beyond the immediate text.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: stop answering the question and start arguing a thesis. A Scholarship essay has a position an intelligent reader might disagree with, and defends it.',
      mToE:'From Scholarship to Outstanding: originality of insight plus real control of your own prose. The writing has to be as good as the reading.'},
    verbs:['argue','analyse','synthesise','evaluate','connect','critique'],
    topics:['Developing an original thesis','Close reading under time pressure','Writer\u2019s craft and its effects','Connecting texts across form and period','Literary and cultural context','Handling counter-argument','Controlling your own prose style'],
    contexts:['Texts studied independently and material supplied in the examination'],
    misconceptions:['Believing Scholarship rewards more sophisticated vocabulary. It rewards more sophisticated thought.',
      'Bringing a prepared essay and bending the question to fit it.',
      'Mistaking assertion for argument.'],
    pitfalls:['A competent Level 3 essay submitted to a Scholarship paper — correct, and not distinctive.',
      'Quotation used to illustrate rather than to prove.',
      'A thesis stated in the introduction and abandoned by the third paragraph.',
      'Prose that is imprecise or overwritten.'] }]},

'History':{
  lens:'Scholarship History rewards genuine historical argument: a defended interpretation, built from evidence, aware that other historians disagree.',
  discipline:'History at this level is historiography as well as history. You argue a case, you know whose case you are arguing against, and every claim carries its evidence.',
  standards:[{ code:'93402', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship History',
    bigIdea:'Argue a historical interpretation of your own, against the alternatives, with the evidence to carry it.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and any digital option.',
    evidence:'Dated specifics, named people and groups, figures where they exist, and historians\u2019 interpretations engaged with rather than reported.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: engage with historiography. A Scholarship answer knows that historians disagree about this, says why, and takes a side.',
      mToE:'From Scholarship to Outstanding: an interpretation that is genuinely yours, sustained across the paper, with the weaknesses of your own case acknowledged.'},
    verbs:['argue','analyse','evaluate','synthesise','justify','critique'],
    topics:['Developing a historical thesis','Historiography and competing interpretations','Weighing causes and consequences','Working with contested evidence','Continuity and change over long periods','Significance argued rather than asserted','Structuring an extended historical argument'],
    contexts:['Historical contexts studied independently, plus material supplied in the examination'],
    misconceptions:['Believing more detail makes a Scholarship answer. Argument does.',
      'Treating historians as authorities to cite rather than positions to weigh.',
      'Narrating events at length and calling the final paragraph an argument.'],
    pitfalls:['Narrative drift, which is fatal at this level.',
      'No engagement with alternative interpretations.',
      'Evidence dropped in without being made to work.',
      'A thesis that no reasonable historian would dispute.'] }]},

'Geography':{
  lens:'Scholarship Geography rewards spatial thinking applied to complex real situations — integrating environments, processes, perspectives and power.',
  discipline:'Geography at this level reasons from located evidence to a defended position. Every claim has a place, a figure and a date, and the analysis works across scales.',
  standards:[{ code:'93303', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Geography',
    bigIdea:'Apply geographic thinking to complex, unfamiliar situations and argue a position about them.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and any digital option.',
    evidence:'Named locations with figures and dates, geographic concepts integrated throughout, and analysis that moves between scales.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: work across scales and across natural and cultural processes at once, rather than treating them as separate questions.',
      mToE:'From Scholarship to Outstanding: an argued position on a contested geographic question, held consistently, with the counter-case addressed.'},
    verbs:['analyse','integrate','evaluate','justify','synthesise','argue'],
    topics:['Integrating natural and cultural processes','Working across spatial scales','Perspectives, values and power','Sustainability and its trade-offs','Interpreting unfamiliar geographic material','Applying the geographic concepts together','Building a spatial argument'],
    contexts:['Unfamiliar geographic material supplied in the examination, plus your own studied environments'],
    misconceptions:['Believing a memorised case study will carry a Scholarship answer.',
      'Treating the geographic concepts as labels rather than tools.',
      'Ignoring power and perspective in what looks like a physical question.'],
    pitfalls:['Case-study knowledge reproduced rather than applied.',
      'Analysis confined to a single scale.',
      'Data quoted without location or date.',
      'Description at length where argument was required.'] }]},

'Classical Studies':{
  lens:'Scholarship Classical Studies rewards argument built directly from ancient evidence, with the limits of that evidence acknowledged.',
  discipline:'Classical Studies at this level argues from primary sources — literary, artistic, archaeological — and stays visible about the gap between what a source shows and what we infer.',
  standards:[{ code:'93404', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Classical Studies',
    bigIdea:'Argue a position about the classical world from the ancient evidence, knowing what that evidence can and cannot establish.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and any digital option.',
    evidence:'Named ancient sources with author and work, specific passages and artworks, Greek and Latin terms used correctly, and the reliability of each source acknowledged.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: interrogate the sources rather than using them. A Scholarship answer knows Thucydides had an agenda and factors that into the argument.',
      mToE:'From Scholarship to Outstanding: an original reading of the ancient world, sustained across the paper and defended against the obvious objection.'},
    verbs:['argue','analyse','evaluate','synthesise','justify','critique'],
    topics:['Building an argument from ancient evidence','Source reliability and authorial agenda','Integrating literary, artistic and archaeological evidence','Ideas, values and ideology','Change across the classical period','Modern scholarship and its debates','Sustaining a classical argument'],
    contexts:['Classical contexts studied independently, plus material supplied in the examination'],
    misconceptions:['Treating ancient authors as neutral reporters.',
      'Believing more quotation is better than better-chosen quotation.',
      'Applying modern values to the ancient world without acknowledging you are doing it.'],
    pitfalls:['Sources described rather than interrogated.',
      'One kind of evidence used when the question invites several.',
      'A prepared essay reshaped to fit the question.',
      'Argument replaced by narrative.'] }]},

'Drama':{
  lens:'Scholarship Drama rewards analysis of theatre as a made thing — the choices, their effects, and what the whole production is arguing.',
  discipline:'Drama at this level argues from what happens on stage. Every claim is anchored to a specific moment and connected to its effect on an audience, and the analysis takes a position about the work.',
  standards:[{ code:'93304', ref:'S', credits:0, mode:'external', verified:true,
    title:'Scholarship Drama',
    bigIdea:'Argue a position about drama and theatre, grounded in precise analysis of specific performance moments.',
    format:'Three-hour examination. Check the current NZQA specification for the paper structure and any digital option.',
    evidence:'Specific moments described precisely — blocking, lighting state, sound, delivery — with the effect explained and connected to the production\u2019s intention.',
    criteria:SCHOL.criteria,
    bandShift:{
      aToM:'From Level 3 Excellence to Scholarship: argue about the theatre rather than describing it. A Scholarship answer takes a position on whether the production achieved what it set out to do, and why.',
      mToE:'From Scholarship to Outstanding: an original reading of the work, connected to wider theatre practice and sustained with precision.'},
    verbs:['argue','analyse','evaluate','synthesise','justify','critique'],
    topics:['Analysing performance choices and their effects','Theatre forms and practitioners','Directorial concept and its execution','Audience response and theatrical meaning','Connecting a production to wider practice','Taking a position on a work','Writing precisely about performance'],
    contexts:['Live and studied performance, plus material supplied in the examination'],
    misconceptions:['Believing enthusiasm for a production is the same as an argument about it.',
      'Describing a performance in detail without saying what it achieved.',
      'Treating theory as something to name rather than to apply.'],
    pitfalls:['Vague recollection instead of precise moments.',
      'Plot or production summary rather than analysis.',
      'No position taken on the work.',
      'Notes not taken at the time, so the detail has gone.'] }]}

};

window.NCEA_DATA = window.NCEA_DATA || {};
window.NCEA_DATA['S'] = {
  meta: { qualification:'New Zealand', stage:'Scholarship', year:2026 },
  faculties: FACULTIES,
  subjects: SUBJECTS
};

})();
