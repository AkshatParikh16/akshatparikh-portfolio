/* Regression test for portfolio chat matcher — run: node scripts/test-chat-matcher.js */
const fs = require('fs');
const path = require('path');

const knowledge = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/portfolio-knowledge.json'), 'utf8')
);

const FALLBACK = "I'm not sure about that one! Akshat would be the best person to ask — akshat.sparikh@gmail.com or (408) 637-9861.";

const IGNORE_TOKENS = { akshat: 1, parikh: 1, jack: 1, he: 1, him: 1, his: 1, she: 1, her: 1 };
const TOPIC_SIGNALS = [
  'sponsorship', 'sponsor', 'visa', 'h1b', 'opt', 'authorized', 'salary', 'compensation',
  'reference', 'referral', 'email', 'phone', 'contact', 'project', 'inspectai', 'docchat',
  'experience', 'intern', 'skill', 'education', 'degree', 'gpa', 'publication', 'resume',
  'remote', 'hybrid', 'relocate', 'start', 'availability', 'churn', 'langgraph', 'aws', 'azure'
];
const INTENT_ROUTES = [
  { id: 'sponsorship', patterns: ['require sponsorship', 'need sponsorship', 'visa sponsorship', 'need visa', 'require visa', 'need sponsor', 'require sponsor', 'sponsorship'] },
  { id: 'work_authorization', patterns: ['allowed to work', 'authorized to work', 'eligible to work', 'work authorization', 'legally authorized', 'permitted to work', 'work in usa', 'work in us', 'work in america', 'work in united states', 'authorized', 'legally work'] },
  { id: 'contact', patterns: ['email', 'phone number', 'phone', 'linkedin', 'github', 'get in touch', 'reach him', 'contact him', 'where is he', 'location', 'san jose'] },
  { id: 'salary', patterns: ['salary', 'compensation', 'pay rate', 'how much', 'pay expectation', 'salary expectation'] },
  { id: 'references', patterns: ['reference', 'references', 'supervisor', 'recommendation', 'who can i contact about him'] },
  { id: 'availability', patterns: ['start date', 'when can he start', 'when can start', 'how soon', 'available to start', 'join date', 'notice period'] },
  { id: 'remote_hybrid', patterns: ['remote', 'hybrid', 'on-site', 'onsite', 'work from home', 'wfh', 'in office'] },
  { id: 'relocation', patterns: ['relocate', 'relocation', 'willing to move', 'move for'] },
  { id: 'projects_inspectai', patterns: ['inspectai', 'inspect ai'] },
  { id: 'projects_docchat', patterns: ['docchat', 'doc chat'] },
  { id: 'projects_churn', patterns: ['churn', 'customer churn'] },
  { id: 'experience_overview', patterns: ['work experience', 'job history', 'where did he work', 'where has he worked', 'his experience', 'career'] },
  { id: 'education', patterns: ['education', 'degree', 'gpa', 'university', 'masters', 'bachelor', 'where did he study'] },
  { id: 'skills', patterns: ['skills', 'tech stack', 'technologies', 'programming languages', 'what does he know'] },
  { id: 'publications', patterns: ['publication', 'paper', 'ieee', 'research paper'] },
  { id: 'resume', patterns: ['resume', 'cv', 'curriculum vitae'] },
  { id: 'intro', patterns: ['who is akshat', 'who is he', 'tell me about akshat', 'about akshat', 'background', 'introduction'] }
];
const STOP_WORDS = {
  a: 1, an: 1, the: 1, is: 1, are: 1, was: 1, were: 1, be: 1, been: 1, being: 1,
  have: 1, has: 1, had: 1, do: 1, does: 1, did: 1, will: 1, would: 1, could: 1,
  should: 1, may: 1, might: 1, must: 1, shall: 1, can: 1, need: 1, to: 1, of: 1,
  in: 1, for: 1, on: 1, with: 1, at: 1, by: 1, from: 1, up: 1, about: 1, into: 1,
  through: 1, during: 1, before: 1, after: 1, above: 1, below: 1, between: 1,
  and: 1, but: 1, or: 1, nor: 1, not: 1, so: 1, yet: 1, both: 1, either: 1, neither: 1,
  i: 1, me: 1, my: 1, we: 1, our: 1, you: 1, your: 1, it: 1, its: 1, they: 1, them: 1, their: 1,
  what: 1, which: 1, who: 1, whom: 1, this: 1, that: 1, these: 1, those: 1, am: 1, if: 1,
  then: 1, else: 1, when: 1, where: 1, why: 1, how: 1, all: 1, any: 1, some: 1, such: 1,
  no: 1, yes: 1, tell: 1, please: 1, give: 1, know: 1, get: 1, got: 1
};
const MIN_SCORE = 2;

const entryMap = {};
knowledge.entries.forEach((e) => { entryMap[e.id] = e; });

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^\w\s@.+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter((w) => w.length > 1 && !STOP_WORDS[w] && !IGNORE_TOKENS[w]);
}

function hasTopicSignal(normalized) {
  return TOPIC_SIGNALS.some((word) => normalized.indexOf(word) !== -1);
}

function routeByIntent(normalized) {
  for (const route of INTENT_ROUTES) {
    for (let j = route.patterns.length - 1; j >= 0; j--) {
      const pattern = route.patterns[j];
      if (normalized.indexOf(pattern) !== -1) {
        if (route.id === 'sponsorship' && normalized.indexOf('authorized') !== -1 && normalized.indexOf('sponsorship') === -1 && normalized.indexOf('sponsor') === -1) {
          continue;
        }
        if (entryMap[route.id]) return entryMap[route.id];
      }
    }
  }
  return null;
}

function scoreEntry(tokens, normalizedQuestion, entry) {
  let score = 0;
  const haystack = normalize(
    (entry.keywords || []).join(' ') + ' ' + (entry.text || '') + ' ' + (entry.id || '').replace(/_/g, ' ')
  );
  if (entry.id === 'intro' && hasTopicSignal(normalizedQuestion)) return 0;
  tokens.forEach((token) => { if (haystack.indexOf(token) !== -1) score += 1; });
  (entry.keywords || []).forEach((kw) => {
    const phrase = normalize(kw);
    if (phrase && phrase.indexOf(' ') !== -1 && normalizedQuestion.indexOf(phrase) !== -1) score += 3;
    else if (phrase && normalizedQuestion.indexOf(phrase) !== -1) score += 2;
  });
  (entry.phrases || []).forEach((phrase) => {
    if (normalizedQuestion.indexOf(normalize(phrase)) !== -1) score += 4;
  });
  return score;
}

function findAnswer(question) {
  const trimmed = String(question || '').trim();
  if (!trimmed) return { id: null, answer: '' };
  const normalized = normalize(trimmed);
  const routed = routeByIntent(normalized);
  if (routed && routed.answer) return { id: routed.id, answer: routed.answer };
  const tokens = tokenize(trimmed);
  let best = null;
  let bestScore = 0;
  let bestPriority = -1;
  knowledge.entries.forEach((entry) => {
    const score = scoreEntry(tokens, normalized, entry);
    const priority = entry.priority || 1;
    if (score > bestScore || (score === bestScore && score >= MIN_SCORE && priority > bestPriority)) {
      bestScore = score;
      bestPriority = priority;
      best = entry;
    }
  });
  if (best && bestScore >= MIN_SCORE && best.answer) return { id: best.id, answer: best.answer };
  return { id: 'fallback', answer: FALLBACK };
}

const tests = [
  { q: 'Will akshat require sponsorship?', expectId: 'sponsorship', expectSnippet: 'sponsorship' },
  { q: 'Is akshat allowed to work in the USA?', expectId: 'work_authorization', expectSnippet: 'authorized to work' },
  { q: "What is Akshat's email?", expectId: 'contact', expectSnippet: 'akshat.sparikh@gmail.com' },
  { q: 'When can he start?', expectId: 'availability', expectSnippet: 'immediately' },
  { q: 'Can you provide references?', expectId: 'references', expectSnippet: 'David Powers' },
  { q: 'Tell me about InspectAI', expectId: 'projects_inspectai', expectSnippet: 'InspectAI' },
  { q: 'What are his salary expectations?', expectId: 'salary', expectSnippet: 'depends on the role' },
  { q: 'What is the weather in Tokyo?', expectId: 'fallback', expectSnippet: "not sure about that one" },
  { q: 'Who is Akshat?', expectId: 'intro', expectSnippet: 'MS graduate' }
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const { id, answer } = findAnswer(t.q);
  const idOk = id === t.expectId;
  const snippetOk = answer.toLowerCase().indexOf(t.expectSnippet.toLowerCase()) !== -1;
  const ok = idOk && snippetOk;
  if (ok) {
    passed++;
    console.log('OK  ', t.q, '->', id);
  } else {
    failed++;
    console.log('FAIL', t.q);
    console.log('      expected id:', t.expectId, 'got:', id);
    console.log('      expected snippet:', t.expectSnippet);
    console.log('      answer:', answer.slice(0, 120) + '...');
  }
}

// Verify intro keywords don't include akshat/parikh
const intro = entryMap.intro;
const introKw = (intro.keywords || []).map((k) => k.toLowerCase());
if (introKw.includes('akshat') || introKw.includes('parikh')) {
  console.log('FAIL intro keywords still contain name tokens');
  failed++;
} else {
  console.log('OK   intro keywords exclude akshat/parikh');
  passed++;
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
