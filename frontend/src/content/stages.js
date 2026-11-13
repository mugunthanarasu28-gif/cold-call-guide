// What each stage of the screen shows. This file is the product: the rest of the app only renders it.
//
// `says`  : what prospects tend to say at this point, so the caller is not surprised.
// `taps`  : what happened at this stage. One tap each. `outcome` is the outcome that tap usually points to,
//           used to pre-fill the outcome when the call ends (the caller can always change it).
// `evidence` : transcript ids each line was taken from. FILL THIS IN as you read the calls.
//
// NOTE: the first draft of this file is built from the task's structure page and the dataset README.
// Replace `says` and `taps` with what you find in the 100 transcripts, and list the ids in `evidence`.

export const STAGES = [
  {
    n: 1, name: "Opening",
    purpose: "Reach the right person and say who you are. They decide in the first ten seconds whether this is worth a minute.",
    says: [
      "Who is calling? What is this regarding?",
      "I am driving, I am in a meeting. Call me later.",
      "He is no longer with the company.",
      "Can we talk in Hindi?",
    ],
    taps: [
      { id: "right_person", label: "Right person on the line" },
      { id: "gatekeeper", label: "Assistant or switchboard answered" },
      { id: "wrong_person", label: "Not the person listed", outcome: "wrong_person" },
      { id: "left_company", label: "They have left the company", outcome: "moved_company" },
      { id: "busy", label: "Busy right now", outcome: "follow_up" },
      { id: "language_or_line", label: "Language switch or bad line", outcome: "call_again" },
    ],
    evidence: [],
  },
  {
    n: 2, name: "Purpose",
    purpose: "Say in one or two sentences why you called, in words they could repeat to a colleague.",
    says: [
      "What does your company do?",
      "Where did you get my number?",
      "Is this a sales call?",
      "Just send me the details.",
    ],
    taps: [
      { id: "asked_what_we_do", label: "Asked what we do" },
      { id: "asked_source", label: "Asked where we got the number" },
      { id: "said_sales_call", label: "Said it is a sales call" },
      { id: "asked_details_first", label: "Asked for details first" },
      { id: "let_me_go_on", label: "Let me go on" },
    ],
    evidence: [],
  },
  {
    n: 3, name: "Permission",
    purpose: "Find out whether they can talk now. A clear yes, a clear no, or a time to call back are all good. Talking on without one is not.",
    says: [
      "Call me after two.",
      "Send it on WhatsApp first.",
      "Yes, tell me. (then silence)",
    ],
    taps: [
      { id: "yes", label: "Clear yes" },
      { id: "time_named", label: "Gave a time to call back", outcome: "follow_up" },
      { id: "send_first", label: "Asked for WhatsApp or email first", outcome: "agreed_to_receive_report" },
      { id: "no_answer", label: "No clear answer, kept talking" },
      { id: "no", label: "No, not interested", outcome: "not_interested" },
      { id: "dnc", label: "Asked not to be called again", outcome: "do_not_call" },
    ],
    evidence: [],
  },
  {
    n: 4, name: "Their business",
    purpose: "Ask about their company and work before saying more about yours. People talk about what they do; they rarely listen to what you do.",
    says: [
      "(one line, then waits for the pitch)",
      "We do not make that. That is a different division.",
      "You tell me about yourself first.",
    ],
    taps: [
      { id: "described", label: "Described their business" },
      { id: "one_line", label: "One line, waiting for us" },
      { id: "corrected_us", label: "Corrected us" },
      { id: "asked_us_first", label: "Asked us to go first" },
    ],
    evidence: [],
  },
  {
    n: 5, name: "Their need",
    purpose: "Hear what they are trying to do or struggling with. Write exactly what they say, not what you understood.",
    says: [
      "We want to enter a new market, or add a product line.",
      "The plant is running below capacity.",
      "Everything is fine. There is nothing we need.",
      "What can you do for a company like ours?",
    ],
    taps: [
      { id: "goal", label: "Named a goal" },
      { id: "struggle", label: "Named a struggle" },
      { id: "nothing_needed", label: "Said nothing is needed" },
      { id: "turned_around", label: "Asked what we can do for them" },
      { id: "interested", label: "Said they are interested", outcome: "interested" },
    ],
    evidence: [],
    wordsHint: "Their exact words, as they said them.",
  },
  {
    n: 6, name: "Objection",
    purpose: "Hear the reason for the no and understand it. A reason you understand can be answered now or on the next call.",
    says: [
      "We already have an agency, a consultant, an in-house team.",
      "Not the right person. Speak to marketing, or the owner.",
      "Send something in writing and we will see.",
    ],
    taps: [
      { id: "have_provider", label: "Already have an agency or team", outcome: "not_interested" },
      { id: "not_right_person", label: "Not the right person", outcome: "wrong_person" },
      { id: "send_in_writing", label: "Send it in writing", outcome: "agreed_to_receive_report" },
      { id: "no_reason", label: "No reason given", outcome: "not_interested" },
      { id: "answered", label: "I answered it and they stayed on" },
    ],
    evidence: [],
    wordsHint: "The reason, in their words.",
  },
  {
    n: 7, name: "Next step",
    purpose: "Agree one concrete thing, named, with a time or a channel: a document, a call, a meeting.",
    says: [
      "Send it on WhatsApp. (may be politeness, not interest)",
      "Call me Thursday after three.",
      "Talk to my colleague.",
    ],
    taps: [
      { id: "doc_whatsapp", label: "Document on WhatsApp", outcome: "agreed_to_receive_report" },
      { id: "doc_email", label: "Document on email", outcome: "agreed_to_receive_report" },
      { id: "time_by_them", label: "They named a time for a call", outcome: "next_step_agreed" },
      { id: "time_by_us", label: "We proposed a time and they agreed", outcome: "next_step_agreed" },
      { id: "meeting", label: "Meeting agreed", outcome: "next_step_agreed" },
      { id: "referral", label: "Pointed us to a colleague", outcome: "wrong_person" },
      { id: "no_step", label: "No next step", outcome: "follow_up" },
    ],
    evidence: [],
    wordsHint: "The exact thing and the time or channel.",
  },
  {
    n: 8, name: "Close",
    purpose: "End the call clearly. Record the outcome, the next step and their words from stage 5.",
    says: [
      "(the line drops, or they hang up mid-sentence)",
      "Thank you, goodbye. (warm, after a no)",
    ],
    taps: [
      { id: "clean_end", label: "Ended cleanly" },
      { id: "dropped", label: "Line dropped or they hung up" },
      { id: "warm_no", label: "Warm goodbye after a no" },
    ],
    evidence: [],
  },
];

export const OUTCOMES = [
  { id: "next_step_agreed", label: "Next step agreed", note: "A meeting, a call at a set time, or a report plus a follow-up call", group: "Moving forward" },
  { id: "agreed_to_receive_report", label: "Will receive a report", note: "They agreed to a document on WhatsApp or email", group: "Moving forward" },
  { id: "interested", label: "Interested", note: "They said so, but nothing is fixed", group: "Moving forward" },
  { id: "follow_up", label: "Follow up", note: "You call again", group: "Call again" },
  { id: "call_again", label: "Call again", note: "Language or line quality got in the way", group: "Call again" },
  { id: "not_interested", label: "Not interested", note: "They declined", group: "Closed" },
  { id: "do_not_call", label: "Do not call", note: "They asked not to be called", group: "Closed" },
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

// From index.csv (100 calls): median length 93.5 s; 68 of 100 calls shorter than 2:00.
export const CALL_LENGTH = { median: 94, shorterThan120: 68, of: 100 };

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
