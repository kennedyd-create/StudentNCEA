/* ============================================================
   NCEA LEVEL 2 — standards data
   Loaded on demand by whs-ncea-engine.html. Keep this file in
   the same folder as the engine.

   To add a subject: copy a subject block and swap the standards.
   To add it to a faculty: add its name to that faculty's
   subjects list below. A name listed there with no entry in
   `subjects` shows as "soon" in the interface.

   verified:true  = code / title / credits / internal-external
   confirmed against NZQA.
   creditsUnverified:true = credit value still to be checked.
   Teaching fields are drafts for the subject teacher to review.
   ============================================================ */
(function () {

const FACULTIES = [
 { name:'Social Sciences', dark:'#7900CC', light:'#F5EFFF', subjects:['Psychology'] },
 { name:'Science',         dark:'#007040', light:'#E4F4E5', subjects:[] },
 { name:'Maths',           dark:'#9F1559', light:'#F8E7EE', subjects:[] },
 { name:'English',         dark:'#22229D', light:'#EBF5FA', subjects:[] },
 { name:'Māori',           dark:'#1A6ABE', light:'#ECFBFF', subjects:[] },
 { name:'Technology',      dark:'#DB2026', light:'#FDECE7', subjects:[] },
 { name:'Arts',            dark:'#9A6300', light:'#FFF7EE', subjects:[] },
 { name:'PE & Health',     dark:'#BF0000', light:'#FFEDED', subjects:[] }
];

const SUBJECTS = {

'Psychology':{
  lens:'The five Psychology strands run across all three levels: approaches, debates, methodologies, fields of practice, and issues. Level 2 asks you to EXAMINE — a step up from Level 1\u2019s demonstrate understanding, and a step below Level 3\u2019s analyse.',
  discipline:'Psychology argues from research evidence about behaviour. Every claim needs a named study with its findings, and the gap between what a study actually showed and what people conclude from it is where most of the marks live.',
  verifyNote:'Every Level 2 Psychology standard is internally assessed — there is no exam in this subject at this level. Codes, titles, credits and internal status are confirmed against the NZQA Psychology achievement standard matrix.',
  standards:[
  { code:'91844', ref:'2.1', credits:6, mode:'internal', verified:true,
    title:'Examine different psychological approaches used to explain a behaviour',
    bigIdea:'Take one behaviour and look at it through several psychological lenses — each approach explains it differently, and each explanation has strengths and blind spots.',
    format:'Internally assessed written response. At 6 credits this is the largest Level 2 Psychology standard. Conditions of assessment are set by your teacher and published on NCEA on TKI.',
    evidence:'Each approach named with its core assumptions, applied to the same specific behaviour, supported by named studies with findings and dates.',
    criteria:{achieved:'Examine different psychological approaches used to explain the behaviour, describing how each explains it.',
      merit:'Examine in depth — explain how each approach accounts for the behaviour, supported by relevant research evidence.',
      excellence:'Examine comprehensively — compare the approaches and evaluate their usefulness in explaining the behaviour.'},
    bandShift:{aToM:'Apply each approach to the specific behaviour with a named study behind it, rather than describing the approach in general.',
      mToE:'Compare the approaches against each other and evaluate which explains this behaviour best, and where each falls short.'},
    verbs:['describe','examine','explain','compare','evaluate'],
    topics:['Biological approach','Cognitive approach','Behaviourist approach','Psychodynamic approach','Humanistic approach','Socio-cultural approach','Applying an approach to a specific behaviour','Strengths and limitations of each approach'],
    contexts:['A behaviour agreed with your teacher — commonly aggression, addiction, phobia, memory or conformity'],
    misconceptions:['Treating the approaches as competing truths where one must be right, rather than as different levels of explanation.',
      'Assuming the biological approach is more scientific because it involves biology.',
      'Describing an approach\u2019s history rather than applying its assumptions to the behaviour.',
      'Confusing the behaviourist and cognitive approaches, which differ on whether internal mental processes count as evidence.'],
    pitfalls:['Approaches explained one after another with no link to the actual behaviour chosen.',
      'No named studies, so the explanations have no evidential support.',
      'Strengths and limitations listed generically rather than in relation to this behaviour.',
      'Note: this is assessed work, so an AI must not draft or reword it.'] },

  { code:'91845', ref:'2.2', credits:3, mode:'internal', verified:true,
    title:'Examine how a psychological debate has changed over time',
    bigIdea:'Psychology argues with itself. Take one long-running debate and track how the argument, and the evidence behind it, has shifted.',
    format:'Internally assessed written response. Conditions of assessment are set by your teacher and published on NCEA on TKI.',
    evidence:'Dated positions in the debate with the researchers or schools who held them, and the specific evidence that moved the argument at each point.',
    criteria:{achieved:'Examine how the debate has changed over time, describing the positions held.',
      merit:'Examine in depth — explain what caused the debate to shift, supported by evidence.',
      excellence:'Examine comprehensively — evaluate the significance of the changes and where the debate now stands.'},
    bandShift:{aToM:'Explain what actually caused each shift — which study, which method, which social change — rather than listing positions in order.',
      mToE:'Evaluate how significant the changes were and take a justified position on where the debate stands now.'},
    verbs:['describe','examine','explain','evaluate','justify'],
    topics:['Nature versus nurture','Free will versus determinism','Reductionism versus holism','Individual versus situational explanations','How new methods change debates','Social context and psychological argument'],
    contexts:['A psychological debate agreed with your teacher'],
    misconceptions:['Treating a debate as settled when most have shifted rather than concluded.',
      'Assuming later positions are automatically better supported.',
      'Framing nature versus nurture as a choice between two options rather than a question about interaction.'],
    pitfalls:['A timeline of positions with no explanation of what caused the change.',
      'Positions unattributed, so the argument has no owners.',
      'Note: this is assessed work, so an AI must not draft or reword it.'] },

  { code:'91846', ref:'2.3', credits:4, mode:'internal', verified:true,
    title:'Conduct psychological research with guidance',
    bigIdea:'Run a real piece of psychological research yourself, and report honestly what it does and does not show.',
    format:'Internally assessed research report, carried out with guidance. Conditions of assessment are set by your teacher and published on NCEA on TKI.',
    evidence:'Your own data with participant numbers and method described in enough detail to be repeated, results processed appropriately, and ethical procedures documented.',
    criteria:{achieved:'Conduct psychological research with guidance and report the findings.',
      merit:'Conduct it in depth — a sound method, appropriate analysis, and findings linked to psychological ideas.',
      excellence:'Conduct it comprehensively — evaluate the method and the validity of the findings, and relate them to existing research.'},
    bandShift:{aToM:'Link your findings to psychological theory rather than reporting what the numbers were.',
      mToE:'Evaluate the method honestly — validity, reliability, sample, ethics — and relate your findings to existing research.'},
    verbs:['plan','collect','analyse','report','evaluate','justify'],
    topics:['Aim and hypothesis','Research methods: experiment, observation, survey, interview','Variables and operationalisation','Sampling and participants','Ethics: consent, deception, debriefing, harm','Analysing and presenting data','Validity and reliability'],
    contexts:['A research topic agreed with your teacher'],
    misconceptions:['Treating ethics as a form to complete rather than a constraint that shapes the method.',
      'Believing a small convenience sample can support a general claim about people.',
      'Confusing correlation from a survey with cause from an experiment.'],
    pitfalls:['Method described too vaguely for anyone to repeat it.',
      'Findings reported with no link to psychological theory.',
      'Evaluation reduced to "more participants next time" with no reasoning about validity.',
      'Note: this is assessed work, so an AI must not draft or reword it.'] },

  { code:'91847', ref:'2.4', credits:5, mode:'internal', verified:true,
    title:'Examine how theory is used in fields of psychological practice',
    bigIdea:'Psychology is applied by real practitioners. Show how a theory actually gets used in a field of practice, and what happens when it does.',
    format:'Internally assessed written response. Conditions of assessment are set by your teacher and published on NCEA on TKI.',
    evidence:'The field and the theory both named specifically, with real examples of practice — techniques, programmes, interventions — and evidence of their outcomes.',
    criteria:{achieved:'Examine how theory is used in a field of psychological practice, describing the application.',
      merit:'Examine in depth — explain how the theory shapes the practice, supported by evidence.',
      excellence:'Examine comprehensively — evaluate the effectiveness of the application and its limitations.'},
    bandShift:{aToM:'Show the theory operating inside actual practice — the specific technique or programme it produces — rather than describing theory and field separately.',
      mToE:'Evaluate how well the application works, with evidence, and identify where the theory does not transfer.'},
    verbs:['describe','examine','explain','evaluate','justify'],
    topics:['Clinical psychology','Educational psychology','Sport psychology','Forensic and organisational psychology','From theory to intervention','Evidence of effectiveness','Limits of applying theory in practice'],
    contexts:['A field of psychological practice and a theory agreed with your teacher'],
    misconceptions:['Assuming a theory transfers cleanly into practice without adaptation.',
      'Treating a practitioner\u2019s claim of effectiveness as evidence of it.',
      'Confusing a field of practice with an approach — clinical psychology uses several approaches.'],
    pitfalls:['Theory explained and field described, with no actual connection shown between them.',
      'No real examples of practice.',
      'Effectiveness asserted with no outcome evidence.',
      'Note: this is assessed work, so an AI must not draft or reword it.'] },

  { code:'91848', ref:'2.5', credits:3, mode:'internal', verified:true,
    title:'Examine ethical issues in psychological practice',
    bigIdea:'Psychology can harm as well as help. Examine a real ethical issue and the competing obligations inside it.',
    format:'Internally assessed written response. Conditions of assessment are set by your teacher and published on NCEA on TKI.',
    evidence:'The issue grounded in real cases or studies, the relevant ethical principles named, and the competing obligations set out with who holds each.',
    criteria:{achieved:'Examine ethical issues in psychological practice, describing the issues and principles involved.',
      merit:'Examine in depth — explain how the ethical principles apply and where they conflict.',
      excellence:'Examine comprehensively — evaluate the issue and justify a reasoned position.'},
    bandShift:{aToM:'Show where the principles actually conflict in the case, rather than listing them.',
      mToE:'Evaluate the competing obligations and justify a reasoned position on how the conflict should be resolved.'},
    verbs:['describe','examine','explain','evaluate','justify'],
    topics:['Informed consent and capacity','Deception and debriefing','Confidentiality and its limits','Protection from harm','Power imbalance between practitioner and client','Cultural safety in Aotearoa New Zealand','Historical studies that breached ethics'],
    contexts:['An ethical issue agreed with your teacher — often drawn from a real case or a historically controversial study'],
    misconceptions:['Reading ethics as a checklist that produces one right answer, rather than as competing obligations to be weighed.',
      'Judging historical studies purely by present-day standards without noting you are doing so.',
      'Treating confidentiality as absolute when it has recognised limits.'],
    pitfalls:['Ethical principles listed with no case to apply them to.',
      'The conflict between principles never identified, which is where the analysis lives.',
      'A position asserted in the conclusion without justification.',
      'Note: this is assessed work, so an AI must not draft or reword it.'] }
  ]}

};

window.NCEA_DATA = window.NCEA_DATA || {};
window.NCEA_DATA['2'] = {
  meta: { qualification:'NCEA', stage:'Level 2', year:2026 },
  faculties: FACULTIES,
  subjects: SUBJECTS
};

})();
