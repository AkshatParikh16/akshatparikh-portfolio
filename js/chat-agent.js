(function() {
  var BOT_NAME = 'Jack';
  var BOT_TAGLINE = "Akshat's personal AI assistant";
  var WELCOME = "I'm Jack, Akshat's personal AI assistant.\n\nAsk about his experience, projects, skills, education, or how to reach him.";
  var FALLBACK = "I don't have that on file.\n\nReach Akshat directly:\n• Email: akshat.sparikh@gmail.com\n• Phone: (408) 637-9861";
  var EMPTY_PROMPT = "Ask about Akshat's experience, projects, skills, education, or how to reach him.";
  var STARTERS = [
    "What's his work experience?",
    "Tell me about his best projects",
    "How can I contact him?"
  ];

  var IGNORE_TOKENS = {
    akshat: 1, parikh: 1, jack: 1, he: 1, him: 1, his: 1, she: 1, her: 1
  };

  var TOPIC_SIGNALS = [
    'sponsorship', 'sponsor', 'visa', 'h1b', 'opt', 'authorized', 'salary', 'compensation',
    'reference', 'referral', 'email', 'phone', 'contact', 'project', 'inspectai', 'docchat',
    'experience', 'intern', 'skill', 'education', 'degree', 'gpa', 'publication', 'resume',
    'remote', 'hybrid', 'relocate', 'start', 'availability', 'churn', 'langgraph', 'aws', 'azure'
  ];

  function matchesExactToken(normalized, words, token) {
    var t = normalize(token);
    if (!t) return false;
    if (normalized === t) return true;
    if (words.length === 1 && words[0] === t) return true;
    if (words.length === 2 && words.join(' ') === t) return true;
    return false;
  }

  function routeByRecruiterIntent(normalized) {
    var words = meaningfulWords(normalized);
    var i, j, intent, entry, pattern, waScore, score;

    if (!recruiterIntents || !recruiterIntents.length) return null;

    for (i = 0; i < recruiterIntents.length; i++) {
      intent = recruiterIntents[i];
      entry = entryMap && entryMap[intent.id] ? entryMap[intent.id] : null;
      if (!entry) continue;

      if (intent.exact) {
        for (j = 0; j < intent.exact.length; j++) {
          if (matchesExactToken(normalized, words, intent.exact[j])) {
            if (intent.id === 'intro' && !isIntroQuestion(normalized)) continue;
            if (intent.id === 'sponsorship' && normalized.indexOf('authorized') !== -1 && !mentionsSponsorship(normalized)) continue;
            return entry;
          }
        }
      }

      if (intent.patterns) {
        for (j = intent.patterns.length - 1; j >= 0; j--) {
          pattern = normalize(intent.patterns[j]);
          if (pattern && normalized.indexOf(pattern) !== -1) {
            if (intent.id === 'intro' && !isIntroQuestion(normalized)) continue;
            if (intent.id === 'sponsorship' && normalized.indexOf('authorized') !== -1 && !mentionsSponsorship(normalized)) continue;
            if (intent.id === 'work_authorization' && mentionsSponsorship(normalized) && normalized.indexOf('authorized') === -1) continue;
            return entry;
          }
        }
      }
    }

    if (mentionsSponsorship(normalized) && normalized.indexOf('authorized') === -1 && entryMap.sponsorship) {
      return entryMap.sponsorship;
    }

    return null;
  }

  function isPhoneQuestion(normalized) {
    if (normalized === 'call' || normalized === 'phone') return true;
    var signals = ['phone number', 'can i call', 'call him', 'give me a call', 'ring him', 'telephone', 'mobile number', 'what is his number', 'what s his number', 'contact number'];
    var i;
    for (i = 0; i < signals.length; i++) {
      if (normalized.indexOf(signals[i]) !== -1) return true;
    }
    return false;
  }

  var INTENT_ROUTES = [
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
    { id: 'experience_overview', patterns: ['work experience', 'job history', 'where did he work', 'where has he worked', 'his experience'] },
    { id: 'education', patterns: ['education', 'degree', 'gpa', 'university', 'masters', 'bachelor', 'where did he study'] },
    { id: 'skills', patterns: ['skills', 'tech stack', 'technologies', 'programming languages', 'what does he know'] },
    { id: 'publications', patterns: ['publication', 'paper', 'ieee', 'research paper'] },
    { id: 'resume', patterns: ['resume', 'cv', 'curriculum vitae'] },
    { id: 'intro', patterns: ['who is akshat', 'who is he', 'tell me about akshat', 'about akshat', 'background', 'introduction'] }
  ];

  var STOP_WORDS = {
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

  var MIN_SCORE = 2;
  var MIN_SEMANTIC_SCORE = 4;
  var MIN_CONFIDENT_SCORE = 5;
  var MIN_ALIAS_SCORE = 2;
  var OVERVIEW_IDS = { intro: 1, experience_overview: 1, projects_overview: 1 };
  var knowledge = null;
  var entryMap = null;
  var semanticTopics = null;
  var recruiterIntents = null;
  var entityRoutes = null;
  var disambiguationRoutes = null;
  var contextFollowUps = null;

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\w\s@.+-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    var i, j, prev, val, row = [];
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    for (i = 0; i <= b.length; i++) row[i] = i;
    for (i = 1; i <= a.length; i++) {
      prev = i;
      for (j = 1; j <= b.length; j++) {
        val = a.charAt(i - 1) === b.charAt(j - 1) ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
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
      if (word.indexOf(target) !== -1 || target.indexOf(word) !== -1) return true;
      if (levenshtein(word, target) <= maxDist) return true;
    }
    return false;
  }

  function mentionsSponsorship(normalized) {
    if (normalized.indexOf('sponsor') !== -1 || normalized.indexOf('sponsorship') !== -1) return true;
    var words = normalized.split(' ');
    var targets = ['sponsorship', 'sponsor', 'spnorship', 'sponsership', 'sponorship'];
    var i, j;
    for (i = 0; i < words.length; i++) {
      for (j = 0; j < targets.length; j++) {
        if (fuzzyWordMatch(words[i], targets[j], 2)) return true;
      }
    }
    return false;
  }

  function isIntroQuestion(normalized) {
    var signals = [
      'who is akshat', 'who is he', 'tell me about akshat', 'about akshat', 'tell me about him',
      'what is akshat', 'introduce akshat', 'background on akshat', 'overview of akshat',
      'candidate background', 'give me an overview', 'high level background'
    ];
    var i;
    for (i = 0; i < signals.length; i++) {
      if (normalized.indexOf(signals[i]) !== -1) return true;
    }
    return false;
  }

  function formatJackAnswer(text, entry) {
    var answer = String(text || '').trim();
    if (!answer) return FALLBACK;
    return answer;
  }

  function renderBotMessage(el, text) {
    var blocks = String(text || '').split('\n\n');
    var b, l, line, lead, para, bullet;

    el.textContent = '';
    for (b = 0; b < blocks.length; b++) {
      if (!blocks[b].trim()) continue;
      var lines = blocks[b].split('\n');
      for (l = 0; l < lines.length; l++) {
        line = lines[l].trim();
        if (!line) continue;
        if (line.indexOf('• ') === 0) {
          bullet = document.createElement('div');
          bullet.className = 'chat-msg__bullet';
          bullet.textContent = line.slice(2);
          el.appendChild(bullet);
        } else if (b === 0 && l === 0 && blocks.length > 1) {
          lead = document.createElement('div');
          lead.className = 'chat-msg__lead';
          lead.textContent = line;
          el.appendChild(lead);
        } else {
          para = document.createElement('div');
          para.className = 'chat-msg__line';
          para.textContent = line;
          el.appendChild(para);
        }
      }
    }
    if (!el.childNodes.length) el.textContent = text;
  }

  function tokenize(text) {
    return normalize(text).split(' ').filter(function(w) {
      return w.length > 1 && !STOP_WORDS[w] && !IGNORE_TOKENS[w];
    });
  }

  function hasTopicSignal(normalized) {
    if (mentionsSponsorship(normalized)) return true;
    return TOPIC_SIGNALS.some(function(word) {
      return normalized.indexOf(word) !== -1;
    });
  }

  function meaningfulWords(normalized) {
    return normalized.split(' ').filter(function(w) {
      return w.length > 1 && !STOP_WORDS[w] && !IGNORE_TOKENS[w];
    });
  }

  function isOffTopicQuestion(normalized) {
    var match = normalized.match(/tell me about (?:his|her|their|the|a|an) ([a-z0-9-]+)/);
    var allowed, topic;
    if (!match) return false;
    topic = match[1];
    allowed = {
      experience: 1, work: 1, projects: 1, project: 1, skills: 1, background: 1,
      education: 1, resume: 1, internship: 1, role: 1, career: 1, inspectai: 1, docchat: 1
    };
    return !allowed[topic];
  }

  function scoreSemanticTopic(normalized, config) {
    var score = 0;
    var words = meaningfulWords(normalized);
    var i, j, phrase, term, t, w;

    (config.paraphrases || []).forEach(function(p) {
      phrase = normalize(p);
      if (phrase && normalized.indexOf(phrase) !== -1) score += 6;
    });

    (config.terms || []).forEach(function(term) {
      t = normalize(term);
      if (!t) return;
      if (normalized.indexOf(t) !== -1) {
        score += t.indexOf(' ') !== -1 ? 4 : 3;
        return;
      }
      for (i = 0; i < words.length; i++) {
        if (fuzzyWordMatch(words[i], t, 2)) score += 2;
      }
    });

    (config.concepts || []).forEach(function(concept) {
      t = normalize(concept);
      if (t && normalized.indexOf(t) !== -1) score += 3;
    });

    return score;
  }

  function routeBySemantic(normalized) {
    var bestId = null;
    var bestScore = 0;
    var secondScore = 0;
    var id, config, score, waScore;

    if (!semanticTopics) return null;

    for (id in semanticTopics) {
      if (!semanticTopics.hasOwnProperty(id)) continue;
      config = semanticTopics[id];
      score = scoreSemanticTopic(normalized, config);
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
      waScore = scoreSemanticTopic(normalized, semanticTopics.work_authorization || {});
      if (waScore >= bestScore - 1) bestId = 'work_authorization';
    }

    if (bestId === 'intro' && !isIntroQuestion(normalized)) return null;
    if (bestId === 'contact' && entryMap.email && scoreSemanticTopic(normalized, semanticTopics.email || {}) >= MIN_SEMANTIC_SCORE) {
      return entryMap.email;
    }
    if (bestId === 'contact' && isPhoneQuestion(normalized) && entryMap.phone) {
      return entryMap.phone;
    }
    if (bestId === 'contact' && entryMap.linkedin && scoreSemanticTopic(normalized, semanticTopics.linkedin || {}) >= MIN_SEMANTIC_SCORE) {
      return entryMap.linkedin;
    }
    if (bestId === 'contact' && entryMap.location && scoreSemanticTopic(normalized, semanticTopics.location || {}) >= MIN_SEMANTIC_SCORE) {
      return entryMap.location;
    }
    if (bestId === 'open_to_work' && scoreSemanticTopic(normalized, semanticTopics.remote_hybrid || {}) >= MIN_SEMANTIC_SCORE) {
      bestId = 'remote_hybrid';
    }
    if (bestScore < secondScore + 1 && secondScore >= MIN_SEMANTIC_SCORE) return null;

    return entryMap && entryMap[bestId] ? entryMap[bestId] : null;
  }

  function semanticEntryBoost(normalized, entry) {
    var config, score = 0;
    if (!semanticTopics) return 0;
    config = semanticTopics[entry.id];
    if (config) score += scoreSemanticTopic(normalized, config);
    (entry.concepts || []).forEach(function(concept) {
      if (normalized.indexOf(normalize(concept)) !== -1) score += 3;
    });
    return score;
  }

  function routeByIntent(normalized) {
    var routed = routeByRecruiterIntent(normalized);
    if (routed) return routed;
    return null;
  }

  function routeByBroadIntent(normalized) {
    var i, j, route, pattern;
    for (i = 0; i < INTENT_ROUTES.length; i++) {
      route = INTENT_ROUTES[i];
      for (j = route.patterns.length - 1; j >= 0; j--) {
        pattern = route.patterns[j];
        if (normalized.indexOf(pattern) !== -1) {
          if (route.id === 'sponsorship' && normalized.indexOf('authorized') !== -1 && !mentionsSponsorship(normalized)) {
            continue;
          }
          if (entryMap && entryMap[route.id]) return entryMap[route.id];
        }
      }
    }
    return null;
  }

  function routeByEntity(normalized) {
    var routes, i, j, route, alias, aliases, entry, exact, bestEntry, bestLen, len;
    if (!entityRoutes || !entityRoutes.length) return null;

    routes = entityRoutes.slice().sort(function(a, b) {
      var aMax = 0;
      var bMax = 0;
      (a.exact || []).forEach(function(item) { if (item.length > aMax) aMax = item.length; });
      (b.exact || []).forEach(function(item) { if (item.length > bMax) bMax = item.length; });
      return bMax - aMax;
    });

    bestEntry = null;
    bestLen = 0;
    for (i = 0; i < routes.length; i++) {
      route = routes[i];
      entry = entryMap && entryMap[route.entryId] ? entryMap[route.entryId] : null;
      if (!entry) continue;
      exact = route.exact || [];
      for (j = 0; j < exact.length; j++) {
        if (normalized === exact[j] || normalized.indexOf(exact[j]) !== -1) {
          len = exact[j].length;
          if (len > bestLen) {
            bestLen = len;
            bestEntry = entry;
          }
        }
      }
    }
    if (bestEntry) return { entry: bestEntry, via: 'entity-exact' };

    if (meaningfulWords(normalized).length === 1) {
      for (i = 0; i < routes.length; i++) {
        route = routes[i];
        entry = entryMap && entryMap[route.entryId] ? entryMap[route.entryId] : null;
        if (!entry) continue;
        aliases = route.aliases || [];
        for (j = 0; j < aliases.length; j++) {
          alias = normalize(aliases[j]);
          if (alias && normalized === alias) {
            return { entry: entry, via: 'entity-alias' };
          }
        }
      }
    }

    return null;
  }

  function routeByDisambiguation(normalized) {
    var words, i, route;
    if (!disambiguationRoutes || !disambiguationRoutes.length) return null;
    words = meaningfulWords(normalized);
    if (words.length !== 1) return null;
    for (i = 0; i < disambiguationRoutes.length; i++) {
      route = disambiguationRoutes[i];
      if (normalize(route.token) === words[0]) {
        return { answer: route.answer, id: 'disambiguation:' + route.token };
      }
    }
    return null;
  }

  function getContextEntryIds(context) {
    var ids = [];
    var lastId, followUps, i;
    if (!context || !context.lastEntryId || !contextFollowUps) return ids;
    lastId = context.lastEntryId;
    followUps = contextFollowUps[lastId];
    if (followUps && followUps.length) {
      for (i = 0; i < followUps.length; i++) ids.push(followUps[i]);
    }
    return ids;
  }

  function scoreContextFollowUp(normalized, entry, context) {
    var ids, i, route, j, alias, aliases, exact, score = 0;
    ids = getContextEntryIds(context);
    if (!ids.length || ids.indexOf(entry.id) === -1) return 0;
    if (meaningfulWords(normalized).length > 4) return 0;

    if (!entityRoutes) return 4;

    for (i = 0; i < entityRoutes.length; i++) {
      route = entityRoutes[i];
      if (ids.indexOf(route.entryId) === -1) continue;
      exact = route.exact || [];
      for (j = 0; j < exact.length; j++) {
        if (normalized.indexOf(exact[j]) !== -1) score += 8;
      }
      aliases = route.aliases || [];
      for (j = 0; j < aliases.length; j++) {
        alias = normalize(aliases[j]);
        if (alias && normalized.indexOf(alias) !== -1) score += 6;
      }
      if (entry.id === route.entryId && score === 0 && meaningfulWords(normalized).length <= 2) {
        score += 5;
      }
    }
    return score;
  }

  function hasSpecificEntitySignal(normalized) {
    var i, route, j, exact, alias, aliases;
    if (!entityRoutes) return false;
    for (i = 0; i < entityRoutes.length; i++) {
      route = entityRoutes[i];
      exact = route.exact || [];
      for (j = 0; j < exact.length; j++) {
        if (normalized.indexOf(exact[j]) !== -1) return true;
      }
      aliases = route.aliases || [];
      for (j = 0; j < aliases.length; j++) {
        alias = normalize(aliases[j]);
        if (alias && normalized.indexOf(alias) !== -1) return true;
      }
    }
    return false;
  }

  function scoreEntry(tokens, normalizedQuestion, entry, context) {
    var score = 0;
    var haystack = normalize(
      (entry.keywords || []).join(' ') + ' ' + (entry.text || '') + ' ' + (entry.id || '').replace(/_/g, ' ')
    );

    if (entry.id === 'intro' && !isIntroQuestion(normalizedQuestion)) {
      return 0;
    }

    if (entry.id === 'intro' && hasTopicSignal(normalizedQuestion)) {
      return 0;
    }

    tokens.forEach(function(token) {
      if (haystack.indexOf(token) !== -1) score += 1;
    });

    (entry.keywords || []).forEach(function(kw) {
      var phrase = normalize(kw);
      if (phrase && phrase.indexOf(' ') !== -1 && normalizedQuestion.indexOf(phrase) !== -1) score += 3;
      else if (phrase && normalizedQuestion.indexOf(phrase) !== -1) score += 2;
    });

    (entry.phrases || []).forEach(function(phrase) {
      if (normalizedQuestion.indexOf(normalize(phrase)) !== -1) score += 4;
    });

    score += semanticEntryBoost(normalizedQuestion, entry);
    score += scoreContextFollowUp(normalizedQuestion, entry, context);

    if (OVERVIEW_IDS[entry.id] && hasSpecificEntitySignal(normalizedQuestion)) {
      score -= 12;
    }

    return score;
  }

  function findMatch(question, context) {
    try {
      var trimmed = String(question || '').trim();
      var normalized, routed, entityHit, disambiguation, tokens, best, second;
      var bestScore = 0;
      var secondScore = 0;
      var bestPriority = -1;
      var viaEntity = false;

      if (!trimmed) return { id: null, answer: EMPTY_PROMPT, entry: null };
      if (!knowledge || !knowledge.entries || !knowledge.entries.length) {
        return { id: 'fallback', answer: FALLBACK, entry: null };
      }

      normalized = normalize(trimmed);

      routed = routeByIntent(normalized);
      if (routed && routed.answer) return { id: routed.id, answer: routed.answer, entry: routed };

      entityHit = routeByEntity(normalized);
      if (entityHit && entityHit.entry && entityHit.entry.answer) {
        return { id: entityHit.entry.id, answer: entityHit.entry.answer, entry: entityHit.entry, via: entityHit.via };
      }

      disambiguation = routeByDisambiguation(normalized);
      if (disambiguation && disambiguation.answer) {
        return { id: disambiguation.id, answer: disambiguation.answer, entry: null };
      }

      routed = routeByBroadIntent(normalized);
      if (routed && routed.answer) return { id: routed.id, answer: routed.answer, entry: routed };

      routed = routeBySemantic(normalized);
      if (routed && routed.answer) return { id: routed.id, answer: routed.answer, entry: routed };

      tokens = tokenize(trimmed);
      if (!tokens.length) return { id: null, answer: EMPTY_PROMPT, entry: null };

      best = null;
      second = null;
      bestScore = 0;
      secondScore = 0;
      bestPriority = -1;

      knowledge.entries.forEach(function(entry) {
        var score = scoreEntry(tokens, normalized, entry, context);
        var priority = entry.priority || 1;
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
        return { id: 'fallback', answer: FALLBACK, entry: null };
      }

      if (best && bestScore >= MIN_SCORE && best.answer) {
        if (isOffTopicQuestion(normalized)) {
          return { id: 'fallback', answer: FALLBACK, entry: null };
        }
        viaEntity = hasSpecificEntitySignal(normalized) || scoreContextFollowUp(normalized, best, context) >= 5;
        if (!viaEntity && bestScore < MIN_CONFIDENT_SCORE && bestScore - secondScore < 2) {
          return { id: 'fallback', answer: FALLBACK, entry: null };
        }
        if (viaEntity && bestScore < MIN_ALIAS_SCORE) {
          return { id: 'fallback', answer: FALLBACK, entry: null };
        }
        return { id: best.id, answer: best.answer, entry: best };
      }

      return { id: 'fallback', answer: FALLBACK, entry: null };
    } catch (err) {
      return { id: 'fallback', answer: FALLBACK, entry: null };
    }
  }

  function findAnswer(question, context) {
    var match = findMatch(question, context || null);
    return formatJackAnswer(match.answer, match.entry);
  }

  function buildEntryMap(data) {
    var map = {};
    (data.entries || []).forEach(function(entry) {
      map[entry.id] = entry;
    });
    return map;
  }

  function loadKnowledge() {
    return fetch('data/portfolio-knowledge.json')
      .then(function(res) {
        if (!res.ok) throw new Error('load failed');
        return res.json();
      })
      .then(function(data) {
        knowledge = data;
        entryMap = buildEntryMap(data);
        semanticTopics = data.semanticTopics || null;
        entityRoutes = data.entityRoutes || null;
        disambiguationRoutes = data.disambiguationRoutes || null;
        contextFollowUps = data.contextFollowUps || null;
        recruiterIntents = (data.recruiterIntents || []).slice().sort(function(a, b) {
          return (b.priority || 0) - (a.priority || 0);
        });
      })
      .catch(function() {
        knowledge = {
          entries: [{
            id: 'contact',
            priority: 10,
            keywords: ['contact', 'email', 'phone'],
            answer: "Reach Akshat at akshat.sparikh@gmail.com or (408) 637-9861."
          }]
        };
        entryMap = buildEntryMap(knowledge);
      });
  }

  function createMessageEl(role, text) {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--' + role;
    el.setAttribute('role', role === 'user' ? 'status' : 'log');
    if (role === 'bot') renderBotMessage(el, text);
    else el.textContent = text;
    return el;
  }

  function initChat(root) {
    var mode = root.getAttribute('data-mode') || 'widget';
    var isFull = mode === 'full';
    var isOpen = isFull;
    var busy = false;
    var chatContext = { lastEntryId: null };

    function updateChatContext(match) {
      if (!match || !match.id || match.id.indexOf('disambiguation:') === 0) return;
      if (match.id === 'fallback') return;
      chatContext.lastEntryId = match.id;
    }

    var toggleBtn = root.querySelector('.chat-toggle');
    var panel = root.querySelector('.chat-panel');
    var messagesEl = root.querySelector('.chat-messages');
    var startersEl = root.querySelector('.chat-starters');
    var form = root.querySelector('.chat-form');
    var input = root.querySelector('.chat-input');
    var sendBtn = root.querySelector('.chat-send');

    function setOpen(open) {
      isOpen = open;
      if (panel) panel.classList.toggle('is-open', open);
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && input) input.focus();
    }

    function scrollMessages() {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendMessage(role, text) {
      if (!messagesEl) return;
      messagesEl.appendChild(createMessageEl(role, text));
      scrollMessages();
    }

    function showTyping() {
      if (!messagesEl) return null;
      var el = document.createElement('div');
      el.className = 'chat-msg chat-msg--bot chat-msg--typing';
      el.textContent = BOT_NAME + ' is typing\u2026';
      messagesEl.appendChild(el);
      scrollMessages();
      return el;
    }

    function handleQuestion(text) {
      if (busy) return;
      var q = String(text || '').trim();
      if (!q) return;
      busy = true;
      appendMessage('user', q);
      if (input) input.value = '';
      if (sendBtn) sendBtn.disabled = true;
      var typingEl = showTyping();

      setTimeout(function() {
        var match = findMatch(q, chatContext);
        var reply = formatJackAnswer(match.answer, match.entry);
        updateChatContext(match);
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        appendMessage('bot', reply);
        busy = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
      }, 320);
    }

    if (startersEl) {
      STARTERS.forEach(function(label) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chat-starter';
        chip.textContent = label;
        chip.addEventListener('click', function() { handleQuestion(label); });
        startersEl.appendChild(chip);
      });
    }

    if (toggleBtn) toggleBtn.addEventListener('click', function() { setOpen(!isOpen); });

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleQuestion(input ? input.value : '');
      });
    }

    if (isFull) {
      setOpen(true);
      appendMessage('bot', WELCOME);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen && !isFull && panel) setOpen(false);
    });
  }

  function buildWidget() {
    if (document.getElementById('portfolio-chat')) return;
    var root = document.createElement('div');
    root.id = 'portfolio-chat';
    root.className = 'portfolio-chat';
    root.setAttribute('data-mode', 'widget');
    root.innerHTML =
      '<button type="button" class="chat-toggle" aria-label="Open chat with Jack" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>' +
        '<span>Ask ' + BOT_NAME + '</span>' +
      '</button>' +
      '<div class="chat-panel" role="dialog" aria-label="Jack, Akshat\'s personal AI assistant">' +
        '<div class="chat-panel-head">' +
          '<div><strong>' + BOT_NAME + '</strong><span>' + BOT_TAGLINE + '</span></div>' +
          '<button type="button" class="chat-close" aria-label="Close chat">&times;</button>' +
        '</div>' +
        '<div class="chat-messages" aria-live="polite"></div>' +
        '<div class="chat-starters"></div>' +
        '<form class="chat-form">' +
          '<input type="text" class="chat-input" placeholder="Ask Jack about experience, projects, skills\u2026" maxlength="500" autocomplete="off" aria-label="Message for Jack">' +
          '<button type="submit" class="chat-send" aria-label="Send message">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);
    root.querySelector('.chat-close').addEventListener('click', function() {
      root.querySelector('.chat-panel').classList.remove('is-open');
      root.querySelector('.chat-toggle').setAttribute('aria-expanded', 'false');
    });
    initChat(root);
  }

  function init() {
    var page = document.body.getAttribute('data-page');
    loadKnowledge().then(function() {
      if (page === 'chat') {
        var fullRoot = document.getElementById('portfolio-chat-full');
        if (fullRoot) initChat(fullRoot);
      } else {
        buildWidget();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
