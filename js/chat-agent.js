(function() {
  var BOT_NAME = 'Jack';
  var BOT_TAGLINE = "Akshat's personal AI assistant";
  var WELCOME = "Hey! I'm Jack — Akshat's personal AI assistant. I can help with his experience, projects, skills, education, and how to reach him. What would you like to know?";
  var FALLBACK = "I'm not sure about that one! Akshat would be the best person to ask — akshat.sparikh@gmail.com or (408) 637-9861.";
  var EMPTY_PROMPT = "Go ahead and ask me about Akshat's experience, projects, skills, education, or how to contact him.";
  var STARTERS = [
    "What's Akshat's work experience?",
    "Tell me about his best projects",
    "How can I get in touch with him?"
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

  var INTENT_ROUTES = [
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
  var knowledge = null;
  var entryMap = null;

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

  function routeByIntent(normalized) {
    var i, j, route, pattern;
    if (mentionsSponsorship(normalized) && normalized.indexOf('authorized') === -1) {
      if (entryMap && entryMap.sponsorship) return entryMap.sponsorship;
    }
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

  function scoreEntry(tokens, normalizedQuestion, entry) {
    var score = 0;
    var haystack = normalize(
      (entry.keywords || []).join(' ') + ' ' + (entry.text || '') + ' ' + (entry.id || '').replace(/_/g, ' ')
    );

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

    return score;
  }

  function findEntryById(id) {
    return entryMap && entryMap[id] ? entryMap[id] : null;
  }

  function findAnswer(question) {
    try {
      var trimmed = String(question || '').trim();
      if (!trimmed) return EMPTY_PROMPT;
      if (!knowledge || !knowledge.entries || !knowledge.entries.length) return FALLBACK;

      var normalized = normalize(trimmed);
      var routed = routeByIntent(normalized);
      if (routed && routed.answer) return routed.answer;

      var tokens = tokenize(trimmed);
      if (!tokens.length) return EMPTY_PROMPT;

      var best = null;
      var bestScore = 0;
      var bestPriority = -1;

      knowledge.entries.forEach(function(entry) {
        var score = scoreEntry(tokens, normalized, entry);
        var priority = entry.priority || 1;
        if (score > bestScore || (score === bestScore && score >= MIN_SCORE && priority > bestPriority)) {
          bestScore = score;
          bestPriority = priority;
          best = entry;
        }
      });

      if (best && bestScore >= MIN_SCORE && best.answer) return best.answer;
      return FALLBACK;
    } catch (err) {
      return FALLBACK;
    }
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
      })
      .catch(function() {
        knowledge = {
          entries: [{
            id: 'contact',
            priority: 10,
            keywords: ['contact', 'email', 'phone'],
            answer: "Sure — you can reach Akshat at akshat.sparikh@gmail.com or (408) 637-9861. He's based in San Jose, CA."
          }]
        };
        entryMap = buildEntryMap(knowledge);
      });
  }

  function createMessageEl(role, text) {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--' + role;
    el.setAttribute('role', role === 'user' ? 'status' : 'log');
    el.textContent = text;
    return el;
  }

  function initChat(root) {
    var mode = root.getAttribute('data-mode') || 'widget';
    var isFull = mode === 'full';
    var isOpen = isFull;
    var busy = false;

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
        var reply = findAnswer(q);
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
          '<input type="text" class="chat-input" placeholder="Ask about experience, projects, skills\u2026" maxlength="500" autocomplete="off" aria-label="Your question">' +
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
