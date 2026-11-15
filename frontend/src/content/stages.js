// What each stage of the screen shows. This file is the product: the rest of the app only renders it.
//
// Built from reading all 100 transcripts (T001 to T100) and counting patterns in them.
//
// `purpose`  : what the caller is trying to get done at this stage.
// `says`     : what prospects say at this point, as short paraphrases (not quotes) so the caller is not surprised.
// `seen`     : one line of what the 100 calls actually show here. Counts marked "about" are keyword counts that I
//              checked by reading the matching lines; the rest were counted exactly.
// `taps`     : what happened at this stage. One tap each. `outcome` is set only where the calls agree with each other,
//              and is used to pre-fill the outcome when the call ends (the caller can always change it).
// `evidence` : transcript ids the lines were taken from. The first five are shown on the screen as "Calls to read".
//
// Two things the transcripts taught that shaped the design:
//  1. The caller asks "is this a good time?" BEFORE saying why they called, so prospects answer with a question
//     (who is this, what is it regarding) instead of a yes or no. Stage 2 and stage 3 are therefore visited in either
//     order; the rail on the left lets the caller jump.
//  2. The logged outcome does not follow from the prospect's words. "Do not call" is logged 10 times and no prospect
//     says it; people who said "not the right person" were logged five different ways. So taps suggest an outcome only
//     where the calls agree, and the caller picks the rest.
//
// Tap ids are kept where the meaning is the same, so earlier saved calls still show their labels.
// Dropped: "said_sales_call" (only 2 of 100 prospects use words like sales call, spam or scam: T093, T096).

export const STAGES = [
  {
    n: 1, name: "Opening",
    purpose: "Reach the right person and say who you are. A wrong person, someone who has left, a language they do not share or a bad line each end a call quickly.",
    says: [
      "(Just “Hello.” and nothing else.)",
      "I am in a meeting. Call me in an hour.",
      "He is no longer with the company.",
      "Can we do this in Hindi, Marathi or Kannada?",
    ],
    seen: "78 of 100 prospects answer with a bare hello or yes. 17 calls were logged wrong person (8), moved company (5) or call again (4). They were the shortest calls: the median was 45 to 71 seconds, depending on the kind.",
    taps: [
      { id: "right_person", label: "Right person on the line" },
      { id: "gatekeeper", label: "Assistant or switchboard answered" },
      { id: "wrong_person", label: "Not the person listed", outcome: "wrong_person" },
      { id: "left_company", label: "They have left the company", outcome: "moved_company" },
      { id: "busy", label: "Busy right now", outcome: "follow_up" },
      { id: "language_or_line", label: "Language switch or bad line", outcome: "call_again" },
    ],
    evidence: ["T038", "T039", "T040", "T028", "T068", "T004", "T022", "T059", "T005", "T033", "T056", "T016", "T031", "T032", "T037", "T027", "T044", "T055", "T062"],
  },
  {
    n: 2, name: "Purpose",
    purpose: "Say in one or two sentences why you called, in words they could repeat to a colleague. Prospects ask who you are and what it is about before they answer anything else, so have it ready.",
    says: [
      "Calling from where? Who are you?",
      "What is this regarding?",
      "What are your charges? Is this paid?",
      "Where did you get my number?",
    ],
    seen: "About 45 of 100 prospects asked who or where from within their first few lines, and about 4 in 10 asked what it was about. 7 asked about cost or what is in it for you, and 5 asked where the number came from.",
    taps: [
      { id: "asked_who", label: "Asked who we are, or where from" },
      { id: "asked_what_we_do", label: "Asked what it is about, or what we do" },
      { id: "asked_cost", label: "Asked about cost or what is in it for us" },
      { id: "asked_source", label: "Asked where we got the number" },
      { id: "asked_details_first", label: "Asked us to send details first" },
      { id: "let_me_go_on", label: "Let me go on" },
    ],
    evidence: ["T002", "T010", "T018", "T021", "T027", "T039", "T004", "T007", "T012", "T025", "T035", "T044", "T047", "T051", "T060", "T064", "T080", "T081", "T063", "T084", "T086", "T087"],
  },
  {
    n: 3, name: "Permission",
    purpose: "Find out whether they can talk now. In these calls it is asked before the purpose is said, so expect a question back rather than a yes or a no. A time to call back is a good answer.",
    says: [
      "Yes, tell me.",
      "Call me after half an hour. Call me tomorrow.",
      "Send it on WhatsApp and I will reply.",
      "Not really. I am not interested at this point.",
    ],
    seen: "71 callers asked if it was a good time. 30 prospects said go ahead, 39 answered with a question or something else (mostly who is this, what is it regarding), and 2 clearly said no. About 22 calls had a busy or call-me-later moment (keyword count); 9 of those were logged follow up and 5 next step agreed.",
    taps: [
      { id: "yes", label: "Said go ahead" },
      { id: "asked_back", label: "Answered with a question instead" },
      { id: "time_named", label: "Gave a time to call back", outcome: "follow_up" },
      { id: "send_first", label: "Asked for WhatsApp or email first", outcome: "agreed_to_receive_report" },
      { id: "no_answer", label: "No clear answer, I kept talking" },
      { id: "no", label: "No, not interested", outcome: "not_interested" },
      // Kept because the outcome exists. None of the 100 calls has a prospect asking for this in words.
      { id: "dnc", label: "Asked not to be called again", outcome: "do_not_call" },
    ],
    evidence: ["T001", "T008", "T012", "T026", "T038", "T041", "T002", "T004", "T007", "T010", "T018", "T021", "T025", "T027", "T035", "T039", "T043", "T044", "T005", "T033", "T056", "T019", "T055", "T020"],
  },
  {
    n: 4, name: "Their business",
    purpose: "Ask about their company and work before saying more about yours. People talk about what they do, and when they do, listen for whether it fits: they often use it to say why it does not.",
    says: [
      "We are a startup. We do not need that yet.",
      "We are the market leader. Growing faster than them does not apply.",
      "I look after one area only, not the whole company.",
      "Which companies have you worked with?",
    ],
    seen: "Prospects who described their business mostly used it to say it did not fit: about 9 said they were too small, too new, the market leader or in another line, and about 15 said they were not the right person or pointed to someone else. 12 asked about us first (website, clients, samples).",
    taps: [
      { id: "described", label: "Described their business" },
      { id: "one_line", label: "One line, waiting for us" },
      { id: "corrected_us", label: "Corrected us" },
      { id: "asked_us_first", label: "Asked about us first (clients, website)" },
      { id: "does_not_fit", label: "Too small, too new, or the market leader" },
      { id: "scope_mismatch", label: "Owns one area only, or decided elsewhere" },
    ],
    evidence: ["T003", "T002", "T048", "T049", "T095", "T097", "T075", "T085", "T044", "T043", "T064", "T087", "T090", "T094"],
  },
  {
    n: 5, name: "Their need",
    purpose: "Hear what they are trying to do or struggling with, and write exactly what they say. Ask open questions: the yes or no growth questions mostly get a bare yes.",
    says: [
      "(“Yes, of course.” Said to almost every scripted growth question.)",
      "The biggest challenge is skilled manpower.",
      "We need to rethink this data as a revenue stream, not an expense.",
      "Show me your report first, then I can answer.",
    ],
    seen: "10 calls used the scripted growth questions (people's growth, trying new things, regular review). The answers were mostly yes or of course. 5 calls asked the open question about the one challenge in their way, and 2 got a clear need back (T089, T098); the others asked for the company name again, pushed back or said they could not answer. T096, the longest call, is where a prospect lays out a need at length.",
    taps: [
      { id: "goal", label: "Named a goal" },
      { id: "struggle", label: "Named a struggle" },
      { id: "said_yes_only", label: "Only said yes to the growth questions" },
      { id: "report_first", label: "Said show me the report first" },
      { id: "nothing_needed", label: "Said nothing is needed" },
      { id: "turned_around", label: "Asked what we can do for them" },
      { id: "interested", label: "Said they are interested", outcome: "interested" },
    ],
    evidence: ["T089", "T096", "T098", "T046", "T085", "T095", "T099", "T100", "T056", "T082", "T093", "T083"],
    wordsHint: "Their exact words, as they said them.",
  },
  {
    n: 6, name: "Objection",
    purpose: "Hear the reason for the no and understand it. A reason you understand can be answered now or on the next call. If they point elsewhere, ask who, and whether they can pass it on.",
    says: [
      "We already have consultants, globally or in-house.",
      "We are not looking for new partners right now.",
      "I am not the right person. Talk to compliance, or someone at head office.",
      "Decisions are taken at the parent company abroad.",
    ],
    seen: "About 6 prospects already had a consultant, agency or internal team, about 15 said they were not the right person or pointed elsewhere, and about 12 said a plain no. Asked who to talk to, 2 gave a name (T025, T030) and 4 refused (T029, T041, T070, T075).",
    taps: [
      { id: "have_provider", label: "Already have an agency or team", outcome: "not_interested" },
      // Not tied to an outcome: of the 16 calls where this came up, 2 were logged wrong person and 10 were logged not interested or do not call.
      { id: "not_right_person", label: "Not the right person" },
      { id: "decided_elsewhere", label: "Decided at head office or abroad" },
      { id: "wont_share_contact", label: "Would not give a colleague's contact" },
      { id: "send_in_writing", label: "Send it in writing", outcome: "agreed_to_receive_report" },
      { id: "no_reason", label: "No reason given", outcome: "not_interested" },
      { id: "answered", label: "I answered it and they stayed on" },
    ],
    evidence: ["T021", "T071", "T077", "T088", "T092", "T018", "T044", "T049", "T079", "T025", "T030", "T029", "T041", "T070", "T075", "T085", "T091"],
    wordsHint: "The reason, in their words.",
  },
  {
    n: 7, name: "Next step",
    purpose: "Agree one concrete thing, named, with a time or a channel: a document, a call, a meeting. Offer two channels (email or WhatsApp) and take their pick, and confirm the address or number.",
    says: [
      "Send it on WhatsApp. I will look and come back.",
      "Email is better. Share it through mail.",
      "Send me your website, clients and a sample first.",
      "Call me tomorrow at three. Tuesday after two is fine.",
    ],
    seen: "About 41 prospects said to send something (keyword count); 22 of those calls were logged report agreed, next step agreed or interested. Some of those yeses were polite: T043 and T091 both said send it while saying they were not looking. 5 calls were callbacks to someone already spoken to or sent a report, and 2 of them ended in a next step agreed, against 9 of the 95 first calls.",
    taps: [
      { id: "doc_whatsapp", label: "Document on WhatsApp", outcome: "agreed_to_receive_report" },
      { id: "doc_email", label: "Document on email", outcome: "agreed_to_receive_report" },
      { id: "asked_our_docs", label: "Asked for our website, clients or samples" },
      { id: "time_by_them", label: "They named a time for a call", outcome: "next_step_agreed" },
      { id: "time_by_us", label: "We proposed a time and they agreed", outcome: "next_step_agreed" },
      { id: "meeting", label: "Meeting agreed", outcome: "next_step_agreed" },
      { id: "referral", label: "Pointed us to a colleague", outcome: "wrong_person" },
      { id: "no_step", label: "No next step", outcome: "follow_up" },
    ],
    evidence: ["T026", "T046", "T052", "T065", "T067", "T001", "T008", "T093", "T062", "T063", "T064", "T072", "T078", "T082", "T087", "T090", "T094", "T025", "T030", "T081", "T043", "T091"],
    wordsHint: "The exact thing and the time or channel.",
  },
  {
    n: 8, name: "Close",
    purpose: "End the call clearly. Record the outcome, the next step and their words from stage 5.",
    says: [
      "Thank you, take care.",
      "Okay. Thank you. (after a no)",
      "(The line goes quiet, or they stop answering mid-sentence.)",
    ],
    seen: "80 of 100 calls ended with a thank you or goodbye from one side: 54 on the caller's thanks, 26 on the prospect's. T028 is the only call that ends on an unanswered question.",
    taps: [
      { id: "clean_end", label: "Ended cleanly" },
      { id: "dropped", label: "Line dropped or they hung up" },
      { id: "warm_no", label: "Warm goodbye after a no" },
    ],
    evidence: ["T024", "T084", "T028", "T037", "T013"],
  },
];

export const OUTCOMES = [
  { id: "next_step_agreed", label: "Next step agreed", note: "A meeting, or a call at a set time", group: "Moving forward" },
  { id: "agreed_to_receive_report", label: "Will receive a report", note: "They agreed to a document on WhatsApp or email", group: "Moving forward" },
  { id: "interested", label: "Interested", note: "They said so, but nothing is fixed", group: "Moving forward" },
  { id: "follow_up", label: "Follow up", note: "You call again", group: "Call again" },
  { id: "call_again", label: "Call again", note: "Language or line quality got in the way", group: "Call again" },
  { id: "not_interested", label: "Not interested", note: "They declined", group: "Closed" },
  { id: "do_not_call", label: "Do not call", note: "A firm no with no door left open, or they asked not to be called", group: "Closed" },
  { id: "wrong_person", label: "Wrong person", note: "Not the person listed, or not the right one", group: "Wrong target" },
  { id: "moved_company", label: "Moved company", note: "No longer works there", group: "Wrong target" },
  { id: "not_logged", label: "Skip logging", note: "Saves the call with no outcome", group: "Skip" },
];

export const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.label]));

export const COMPANY_KINDS = [
  "Listed Indian company",
  "India arm of a multinational",
  "Large private company",
  "Mid-size private company",
  "Mid-size private manufacturer",
  "Small private company",
  "Startup",
  "Public sector utility",
  "Not known",
];

// From the 100 transcripts. "Positive" means logged as report agreed, next step agreed or interested.
// Median length 93.5 s. 68 calls ran under 2:00 and 15 of those were positive; 32 ran longer and 17 of those were positive.
// Longer calls are more often positive, but a call that is going well also runs longer, so this is not advice to talk longer.
export const CALL_LENGTH = {
  median: 94, shorterThan120: 68, of: 100,
  positiveUnder120: 15, positiveOver120: 17,
};

export const tapLabel = (stageN, tapId) =>
  STAGES[stageN - 1].taps.find((t) => t.id === tapId)?.label || tapId;

// Pick the outcome the taps point to: latest stage first, latest tap within it.
export function suggestOutcome(results) {
  for (let n = 8; n >= 1; n--) {
    const taps = results?.[n]?.taps || [];
    for (let i = taps.length - 1; i >= 0; i--) {
      const hit = STAGES[n - 1].taps.find((t) => t.id === taps[i] && t.outcome);
      if (hit) return hit.outcome;
    }
  }
  return null;
}
