// Tramokyo 2026 feedback survey — the single source of truth for questions.
// Imported by survey.html (renders the form), api/survey.js (validates
// submissions) and admin.html (tallies + CSV). Plain ESM, no browser or
// Node-only APIs, so it runs in both places.

export const SURVEY_VERSION = 1;

const DATES_2026 = [
  'Thursday, October 15',
  'Friday, October 16',
  'Saturday, October 17',
  'Sunday, October 18',
  'Monday, October 19'
];

const AGREE = ['Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree'];
const QUALITY = ['Excellent', 'Good', 'Fair', 'Poor', "Didn't notice / Didn't interact"];

const NO_CHALLENGES = 'No challenges';

// Question types:
//   text       short answer          -> string
//   paragraph  long answer           -> string
//   single     pick one              -> string (one of options)
//   multi      pick any              -> string[] (subset of options)
//   grid       one pick per row      -> { [rowId]: column }
// Flags:
//   optional   may be left blank (everything else is required when shown)
//   other      option that reveals a text box, stored as `${id}Other`
//   exclusive  options that can't be combined with any other pick
//   showIf     (answers) => boolean; hidden questions are dropped and never required
//   notBefore  for `single` date questions: index must be >= that question's index
export const SURVEY_SECTIONS = [
  {
    id: 'about', letter: 'A', title: 'About You', jp: '参加者',
    questions: [
      { n: 1, id: 'name', type: 'text', label: 'What is your name?', optional: true,
        hint: 'Leave it blank to stay anonymous.' },
      { n: 2, id: 'pronouns', type: 'single', label: 'What are your pronouns?', optional: true,
        options: ['She/her', 'He/him', 'They/them', 'Self-describe', 'Prefer not to say'],
        other: 'Self-describe' },
      { n: 3, id: 'firstTime', type: 'single', label: 'Was this your first Tramokyo?',
        options: ['Yes', 'No'] },
      { n: 4, id: 'arrived', type: 'single', label: 'When did you arrive at Tramokyo?',
        options: DATES_2026 },
      { n: 5, id: 'departed', type: 'single', label: 'When did you depart Tramokyo?',
        options: DATES_2026, notBefore: 'arrived' }
    ]
  },
  {
    id: 'experience', letter: 'B', title: 'Your Festival Experience', jp: '体験',
    questions: [
      { n: 6, id: 'overall', type: 'single', label: 'How would you rate your overall Tramokyo experience?',
        options: ['Excellent', 'Good', 'Average', 'Below average', 'Poor'] },
      { n: 7, id: 'favorites', type: 'paragraph', label: 'What were your favorite things about Tramokyo?' },
      { n: 8, id: 'improve', type: 'paragraph', label: 'What could we improve for future Tramokyo gatherings?' },
      { n: 9, id: 'crowdSize', type: 'single', label: 'How did you feel about the number of attendees at Tramokyo?',
        options: ['A lot fewer people', 'A few fewer people', 'Just right', 'A few more people', 'A lot more people'] },
      { n: 10, id: 'crowdSizeWhy', type: 'paragraph', optional: true,
        label: 'What influenced your preference regarding the number of attendees?' }
    ]
  },
  {
    id: 'community', letter: 'C', title: 'Community, Safety & Support', jp: '安全',
    questions: [
      { n: 11, id: 'welcomed', type: 'single', label: 'I felt welcomed and included throughout Tramokyo.',
        options: AGREE },
      { n: 12, id: 'safe', type: 'single', label: 'I felt safe and supported throughout the event.',
        options: AGREE },
      { n: 13, id: 'rangers', type: 'single',
        label: 'How would you rate the visibility and approachability of the Tramokyo Rangers?',
        options: QUALITY },
      { n: 14, id: 'medical', type: 'single',
        label: 'How would you rate the visibility and accessibility of medical support?',
        options: QUALITY },
      { n: 15, id: 'supportIdeas', type: 'paragraph', optional: true,
        label: 'Do you have any feedback or suggestions for improving Ranger or medical support?' },
      { n: 16, id: 'challenges', type: 'multi', label: 'Did you experience any challenges during Tramokyo?',
        hint: 'Select all that apply.',
        options: ['Transportation or parking', 'Finding information', 'Scheduling or activities',
          'Bathrooms or facilities', 'Camping', 'Safety or security concerns', 'Other', NO_CHALLENGES],
        exclusive: [NO_CHALLENGES] },
      { n: 17, id: 'challengesDetail', type: 'paragraph', label: 'Please describe the challenges you experienced.',
        showIf: (a) => Array.isArray(a.challenges) && a.challenges.some(c => c !== NO_CHALLENGES) }
    ]
  },
  {
    id: 'facilities', letter: 'D', title: 'Facilities & Essential Services', jp: '設備',
    questions: [
      { n: 18, id: 'facilities', type: 'grid',
        label: 'How would you rate the availability of the following facilities and services at Tramokyo?',
        rows: [
          { id: 'bathrooms', label: 'Bathrooms' },
          { id: 'showers', label: 'Showers' },
          { id: 'water', label: 'Drinking water and refill stations' },
          { id: 'power', label: 'Electricity and charging stations' },
          { id: 'lounges', label: 'Lounges and communal hangout spaces' },
          { id: 'shade', label: 'Shaded or sheltered areas' }
        ],
        columns: ['Far too few', 'Slightly too few', 'Just right', 'More than enough', "Didn't use"] },
      { n: 19, id: 'improveFacilities', type: 'multi',
        label: 'Which facilities or essential services would you most like us to improve for Tramokyo 2027?',
        hint: 'Select all that apply.',
        options: ['More bathrooms', 'More showers', 'More drinking water stations',
          'More electricity and charging access', 'More lounges and communal spaces',
          'More shaded or sheltered areas', 'Everything was sufficient', 'Other'],
        exclusive: ['Everything was sufficient'], other: 'Other' }
    ]
  },
  {
    id: 'pricing', letter: 'E', title: 'Pricing & Merchandise', jp: '料金',
    questions: [
      { n: 20, id: 'ticketPrice', type: 'single',
        label: 'How did you feel about the Tramokyo ticket price relative to your overall experience?',
        options: ['Much too expensive', 'Slightly too expensive', 'Fair price', 'Slightly too cheap', 'Much too cheap'] },
      { n: 21, id: 'boughtMerch', type: 'single', label: 'Did you purchase a kimono or other Tramokyo merchandise?',
        options: ['Yes', 'No'] },
      { n: 22, id: 'merchPrice', type: 'single', label: 'How did you feel about the merchandise pricing?',
        options: ['Too expensive', 'Slightly expensive', 'Fair price', 'Great value'],
        showIf: (a) => a.boughtMerch === 'Yes' },
      { n: 23, id: 'merchIdeas', type: 'paragraph', optional: true,
        label: 'What merchandise would you like to see offered in the future?' }
    ]
  },
  {
    id: 'next', letter: 'F', title: 'Tramokyo 2027', jp: '来年',
    questions: [
      { n: 24, id: 'return', type: 'single', label: 'Would you attend Tramokyo again in 2027?',
        options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'] },
      { n: 25, id: 'dates2027', type: 'multi', label: 'Which dates would work best for Tramokyo 2027?',
        hint: 'Select all that apply. Each option is a five-day Thursday–Monday.',
        options: ['September 9–13', 'September 16–20', 'October 7–11', 'October 14–18',
          'No preference', 'None of these dates work'],
        exclusive: ['No preference', 'None of these dates work'] },
      { n: 26, id: 'excitement', type: 'paragraph', optional: true,
        label: 'What would make you more excited to return to Tramokyo in 2027?' }
    ]
  },
  {
    id: 'final', letter: 'G', title: 'Final Thoughts', jp: '感想',
    questions: [
      { n: 27, id: 'keep', type: 'paragraph', optional: true,
        label: "What's one thing about Tramokyo that we absolutely should not change?" },
      { n: 28, id: 'anythingElse', type: 'paragraph', optional: true,
        label: 'Is there anything else you’d like to share with the Tramokyo organizers?' }
    ]
  }
];

export const SURVEY_QUESTIONS = SURVEY_SECTIONS.flatMap(s => s.questions);

export const MAX_TEXT = 4000;

export function isVisible(q, answers) {
  return typeof q.showIf === 'function' ? !!q.showIf(answers || {}) : true;
}

function cleanText(v) {
  return typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : '';
}

/**
 * Validates raw answers against the schema.
 * Returns { answers, errors } where `answers` contains only known, allowed,
 * visible values and `errors` maps question id -> short error code.
 */
export function validateSurvey(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const answers = {};
  const errors = {};

  // First pass: clean every value without visibility rules, so showIf
  // checks see sanitized data.
  for (const q of SURVEY_QUESTIONS) {
    const v = raw[q.id];
    if (q.type === 'text' || q.type === 'paragraph') {
      const t = cleanText(v);
      if (t) answers[q.id] = t;
    } else if (q.type === 'single') {
      if (typeof v === 'string' && q.options.includes(v)) answers[q.id] = v;
      else if (v != null && v !== '') errors[q.id] = 'bad_option';
    } else if (q.type === 'multi') {
      const arr = Array.isArray(v) ? v : [];
      const picked = q.options.filter(o => arr.includes(o)); // de-dupe + schema order
      if (arr.some(x => !q.options.includes(x))) errors[q.id] = 'bad_option';
      if (picked.length) answers[q.id] = picked;
    } else if (q.type === 'grid') {
      const obj = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      const out = {};
      for (const r of q.rows) {
        if (typeof obj[r.id] === 'string' && q.columns.includes(obj[r.id])) out[r.id] = obj[r.id];
        else if (obj[r.id] != null && obj[r.id] !== '') errors[q.id] = 'bad_option';
      }
      if (Object.keys(out).length) answers[q.id] = out;
    }
    if (q.other) {
      const chosen = q.type === 'multi' ? (answers[q.id] || []).includes(q.other) : answers[q.id] === q.other;
      const t = cleanText(raw[q.id + 'Other']);
      if (chosen && t) answers[q.id + 'Other'] = t;
    }
  }

  // Second pass: visibility, required, exclusivity, ordering.
  for (const q of SURVEY_QUESTIONS) {
    if (!isVisible(q, answers)) {
      delete answers[q.id];
      delete answers[q.id + 'Other'];
      delete errors[q.id];
      continue;
    }
    const v = answers[q.id];
    const empty = v == null ||
      (q.type === 'grid' && Object.keys(v).length < q.rows.length);
    if (!q.optional && empty && !errors[q.id]) errors[q.id] = 'required';

    if (q.type === 'multi' && q.exclusive && Array.isArray(v) && v.length > 1 &&
        v.some(x => q.exclusive.includes(x))) {
      errors[q.id] = 'exclusive';
    }
    if (q.notBefore && v && answers[q.notBefore]) {
      if (q.options.indexOf(v) < q.options.indexOf(answers[q.notBefore])) errors[q.id] = 'before_arrival';
    }
  }

  return { answers, errors };
}

/** Flat column list for CSV export: [{ key, label, get(answers) }]. */
export function surveyColumns() {
  const cols = [];
  for (const q of SURVEY_QUESTIONS) {
    if (q.type === 'grid') {
      for (const r of q.rows) {
        cols.push({ key: `${q.id}.${r.id}`, label: `Q${q.n} ${r.label}`, get: a => (a[q.id] || {})[r.id] || '' });
      }
    } else {
      cols.push({ key: q.id, label: `Q${q.n} ${q.label}`,
        get: a => Array.isArray(a[q.id]) ? a[q.id].join('; ') : (a[q.id] || '') });
    }
    if (q.other) {
      cols.push({ key: q.id + 'Other', label: `Q${q.n} (${q.other} — specify)`, get: a => a[q.id + 'Other'] || '' });
    }
  }
  return cols;
}
