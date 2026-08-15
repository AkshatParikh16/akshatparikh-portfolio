/* Regression test for portfolio chat matcher — run: node scripts/test-chat-matcher.js */
const fs = require('fs');
const path = require('path');

const knowledge = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/portfolio-knowledge.json'), 'utf8')
);

const FALLBACK = "I don't have that in Akshat's portfolio notes.";
const MIN_CONFIDENT_SCORE = 5;

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
  { id: 'phone', patterns: ['phone number', 'can i call', 'call him', 'give me a call', 'what is his number', 'contact number', 'telephone', 'mobile number'] },
  { id: 'contact', patterns: ['email', 'linkedin', 'github', 'get in touch', 'reach him', 'contact him', 'where is he', 'location', 'san jose', 'how to contact'] },
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
const MIN_SEMANTIC_SCORE = 4;

const entryMap = {};
knowledge.entries.forEach((e) => { entryMap[e.id] = e; });
const semanticTopics = knowledge.semanticTopics || null;

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^\w\s@.+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const row = [];
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  for (let i = 0; i <= b.length; i++) row[i] = i;
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function fuzzyWordMatch(word, target, maxDist) {
  if (!word || !target) return false;
  if (word === target) return true;
  if (word.length >= 4 && target.length >= 4) {
    if (word.includes(target) || target.includes(word)) return true;
    if (levenshtein(word, target) <= maxDist) return true;
  }
  return false;
}

function isPhoneQuestion(normalized) {
  if (normalized === 'call' || normalized === 'phone') return true;
  const signals = ['phone number', 'can i call', 'call him', 'give me a call', 'ring him', 'telephone', 'mobile number', 'what is his number', 'what s his number', 'contact number'];
  return signals.some((signal) => normalized.indexOf(signal) !== -1);
}

function isIntroQuestion(normalized) {
  const signals = [
    'who is akshat', 'who is he', 'tell me about akshat', 'about akshat', 'tell me about him',
    'what is akshat', 'introduce akshat', 'background on akshat', 'overview of akshat',
    'candidate background', 'give me an overview', 'high level background'
  ];
  return signals.some((signal) => normalized.indexOf(signal) !== -1);
}

function mentionsSponsorship(normalized) {
  if (normalized.includes('sponsor') || normalized.includes('sponsorship')) return true;
  const targets = ['sponsorship', 'sponsor', 'spnorship', 'sponsership', 'sponorship'];
  return normalized.split(' ').some((word) =>
    targets.some((target) => fuzzyWordMatch(word, target, 2))
  );
}

function tokenize(text) {
  return normalize(text).split(' ').filter((w) => w.length > 1 && !STOP_WORDS[w] && !IGNORE_TOKENS[w]);
}

function hasTopicSignal(normalized) {
  if (mentionsSponsorship(normalized)) return true;
  return TOPIC_SIGNALS.some((word) => normalized.indexOf(word) !== -1);
}

function meaningfulWords(normalized) {
  return normalized.split(' ').filter((w) => w.length > 1 && !STOP_WORDS[w] && !IGNORE_TOKENS[w]);
}

function isOffTopicQuestion(normalized) {
  const match = normalized.match(/tell me about (?:his|her|their|the|a|an) ([a-z0-9-]+)/);
  if (!match) return false;
  const allowed = {
    experience: 1, work: 1, projects: 1, project: 1, skills: 1, background: 1,
    education: 1, resume: 1, internship: 1, role: 1, career: 1, inspectai: 1, docchat: 1
  };
  return !allowed[match[1]];
}

function scoreSemanticTopic(normalized, config) {
  let score = 0;
  const words = meaningfulWords(normalized);
  (config.paraphrases || []).forEach((p) => {
    const phrase = normalize(p);
    if (phrase && normalized.indexOf(phrase) !== -1) score += 6;
  });
  (config.terms || []).forEach((term) => {
    const t = normalize(term);
    if (!t) return;
    if (normalized.indexOf(t) !== -1) {
      score += t.includes(' ') ? 4 : 3;
      return;
    }
    words.forEach((w) => {
      if (fuzzyWordMatch(w, t, 2)) score += 2;
    });
  });
  (config.concepts || []).forEach((concept) => {
    const t = normalize(concept);
    if (t && normalized.indexOf(t) !== -1) score += 3;
  });
  return score;
}

function routeBySemantic(normalized) {
  if (!semanticTopics) return null;
  let bestId = null;
  let bestScore = 0;
  let secondScore = 0;
  for (const id of Object.keys(semanticTopics)) {
    const score = scoreSemanticTopic(normalized, semanticTopics[id]);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestId = id;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }
  if (!bestId || bestScore < MIN_SEMANTIC_SCORE) return null;
  if (bestId === 'sponsorship' && normalized.indexOf('authorized') !== -1 && !mentionsSponsorship(normalized)) {
    const waScore = scoreSemanticTopic(normalized, semanticTopics.work_authorization || {});
    if (waScore >= bestScore - 1) bestId = 'work_authorization';
  }
  if (bestId === 'intro' && !isIntroQuestion(normalized)) return null;
  if (bestId === 'contact' && isPhoneQuestion(normalized) && entryMap.phone) return entryMap.phone;
  if (bestId === 'open_to_work' && scoreSemanticTopic(normalized, semanticTopics.remote_hybrid || {}) >= MIN_SEMANTIC_SCORE) {
    bestId = 'remote_hybrid';
  }
  if (bestScore < secondScore + 1 && secondScore >= MIN_SEMANTIC_SCORE) return null;
  return entryMap[bestId] || null;
}

function semanticEntryBoost(normalized, entry) {
  let score = 0;
  if (!semanticTopics) return 0;
  const config = semanticTopics[entry.id];
  if (config) score += scoreSemanticTopic(normalized, config);
  (entry.concepts || []).forEach((concept) => {
    if (normalized.indexOf(normalize(concept)) !== -1) score += 3;
  });
  return score;
}

function routeByIntent(normalized) {
  if (mentionsSponsorship(normalized) && normalized.indexOf('authorized') === -1) {
    if (entryMap.sponsorship) return entryMap.sponsorship;
  }
  if (isPhoneQuestion(normalized) && entryMap.phone) return entryMap.phone;
  for (const route of INTENT_ROUTES) {
    for (let j = route.patterns.length - 1; j >= 0; j--) {
      const pattern = route.patterns[j];
      if (normalized.indexOf(pattern) !== -1) {
        if (route.id === 'sponsorship' && normalized.indexOf('authorized') !== -1 && !mentionsSponsorship(normalized)) {
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
  if (entry.id === 'intro' && !isIntroQuestion(normalizedQuestion)) return 0;
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
  score += semanticEntryBoost(normalizedQuestion, entry);
  return score;
}

function findAnswer(question) {
  const trimmed = String(question || '').trim();
  if (!trimmed) return { id: null, answer: '' };
  const normalized = normalize(trimmed);
  let routed = routeByIntent(normalized);
  if (routed && routed.answer) return { id: routed.id, answer: routed.answer };
  routed = routeBySemantic(normalized);
  if (routed && routed.answer) return { id: routed.id, answer: routed.answer };
  const tokens = tokenize(trimmed);
  let best = null;
  let bestScore = 0;
  let bestPriority = -1;
  let second = null;
  let secondScore = 0;
  knowledge.entries.forEach((entry) => {
    const score = scoreEntry(tokens, normalized, entry);
    const priority = entry.priority || 1;
    if (score > bestScore) {
      secondScore = bestScore;
      second = best;
      bestScore = score;
      bestPriority = priority;
      best = entry;
    } else if (score > secondScore) {
      secondScore = score;
      second = entry;
    } else if (score === bestScore && score >= MIN_SCORE && priority > bestPriority) {
      second = best;
      secondScore = bestScore;
      bestScore = score;
      bestPriority = priority;
      best = entry;
    }
  });
  if (best && best.id === 'intro' && !isIntroQuestion(normalized)) {
    return { id: 'fallback', answer: FALLBACK };
  }
  if (best && bestScore >= MIN_SCORE && best.answer) {
    if (isOffTopicQuestion(normalized)) {
      return { id: 'fallback', answer: FALLBACK };
    }
    if (bestScore < MIN_CONFIDENT_SCORE && bestScore - secondScore < 2) {
      return { id: 'fallback', answer: FALLBACK };
    }
    return { id: best.id, answer: best.answer };
  }
  return { id: 'fallback', answer: FALLBACK };
}

const tests = [
  { q: 'Will akshat require sponsorship?', expectId: 'sponsorship', expectSnippet: 'sponsorship' },
  { q: 'will akshat require spnorship?', expectId: 'sponsorship', expectSnippet: 'sponsorship' },
  { q: 'Does the company need to sponsor his visa?', expectId: 'sponsorship', expectSnippet: 'sponsorship' },
  { q: 'Is akshat allowed to work in the USA?', expectId: 'work_authorization', expectSnippet: 'authorized to work' },
  { q: 'Can he legally work in the United States?', expectId: 'work_authorization', expectSnippet: 'authorized to work' },
  { q: "What is Akshat's email?", expectId: 'contact', expectSnippet: 'akshat.sparikh@gmail.com' },
  { q: 'Call?', expectId: 'phone', expectSnippet: '(408) 637-9861' },
  { q: 'Can I call him?', expectId: 'phone', expectSnippet: '(408) 637-9861' },
  { q: 'How do I reach out to him?', expectId: 'contact', expectSnippet: 'akshat.sparikh@gmail.com' },
  { q: 'When can he start?', expectId: 'availability', expectSnippet: 'immediately' },
  { q: 'How soon can he join the team?', expectId: 'availability', expectSnippet: 'immediately' },
  { q: 'Can you provide references?', expectId: 'references', expectSnippet: 'David Powers' },
  { q: 'Who can vouch for him professionally?', expectId: 'references', expectSnippet: 'David Powers' },
  { q: 'Tell me about InspectAI', expectId: 'projects_inspectai', expectSnippet: 'InspectAI' },
  { q: 'What are his salary expectations?', expectId: 'salary', expectSnippet: 'depends on the role' },
  { q: 'What kind of pay is he looking for?', expectId: 'salary', expectSnippet: 'depends on the role' },
  { q: 'Is he open to working from home?', expectId: 'remote_hybrid', expectSnippet: 'flexible' },
  { q: 'Would he relocate for the right role?', expectId: 'relocation', expectSnippet: 'open to relocation' },
  { q: 'What is the weather in Tokyo?', expectId: 'fallback', expectSnippet: "don't have that" },
  { q: 'Tell me about his dog', expectId: 'fallback', expectSnippet: "don't have that" },
  { q: 'Who is Akshat?', expectId: 'intro', expectSnippet: 'quick snapshot' }
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
