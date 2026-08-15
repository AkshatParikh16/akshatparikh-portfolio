(function() {
  var FALLBACK = "I don't have that information in Akshat's portfolio. For more details, please reach out at akshat.sparikh@gmail.com or (408) 637-9861.";
  var EMPTY_PROMPT = "Please type a question about Akshat's experience, projects, skills, education, or how to contact him.";
  var STARTERS = [
    "What is Akshat's experience?",
    "Tell me about his projects",
    "How can I contact him?"
  ];
  var STOP_WORDS = {
    a: 1, an: 1, the: 1, is: 1, are: 1, was: 1, were: 1, be: 1, been: 1, being: 1,
    have: 1, has: 1, had: 1, do: 1, does: 1, did: 1, will: 1, would: 1, could: 1,
    should: 1, may: 1, might: 1, must: 1, shall: 1, can: 1, need: 1, to: 1, of: 1,
    in: 1, for: 1, on: 1, with: 1, at: 1, by: 1, from: 1, up: 1, about: 1, into: 1,
    through: 1, during: 1, before: 1, after: 1, above: 1, below: 1, between: 1,
    and: 1, but: 1, or: 1, nor: 1, not: 1, so: 1, yet: 1, both: 1, either: 1, neither: 1,
    i: 1, me: 1, my: 1, we: 1, our: 1, you: 1, your: 1, he: 1, him: 1, his: 1, she: 1,
    her: 1, it: 1, its: 1, they: 1, them: 1, their: 1, what: 1, which: 1, who: 1, whom: 1,
    this: 1, that: 1, these: 1, those: 1, am: 1, if: 1, then: 1, else: 1, when: 1, where: 1,
    why: 1, how: 1, all: 1, any: 1, some: 1, such: 1, no: 1, yes: 1, tell: 1, please: 1,
    give: 1, know: 1, get: 1, got: 1
  };
  var MIN_SCORE = 2;
  var knowledge = null;

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\w\s@.+-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(text) {
    return normalize(text).split(' ').filter(function(w) {
      return w.length > 1 && !STOP_WORDS[w];
    });
  }

  function scoreEntry(tokens, entry) {
    var score = 0;
    var haystack = normalize(
      (entry.keywords || []).join(' ') + ' ' + (entry.text || '') + ' ' + (entry.id || '').replace(/_/g, ' ')
    );
    tokens.forEach(function(token) {
      if (haystack.indexOf(token) !== -1) score += 1;
    });
    (entry.keywords || []).forEach(function(kw) {
      var phrase = normalize(kw);
      if (phrase && normalize(tokens.join(' ')).indexOf(phrase) !== -1) score += 2;
    });
    return score;
  }

  function findAnswer(question) {
    try {
      var trimmed = String(question || '').trim();
      if (!trimmed) return EMPTY_PROMPT;
      if (!knowledge || !knowledge.entries || !knowledge.entries.length) return FALLBACK;

      var tokens = tokenize(trimmed);
      if (!tokens.length) return EMPTY_PROMPT;

      var best = null;
      var bestScore = 0;
      knowledge.entries.forEach(function(entry) {
        var score = scoreEntry(tokens, entry);
        if (score > bestScore) {
          bestScore = score;
          best = entry;
        }
      });

      if (best && bestScore >= MIN_SCORE && best.answer) return best.answer;
      return FALLBACK;
    } catch (err) {
      return FALLBACK;
    }
  }

  function loadKnowledge() {
    return fetch('data/portfolio-knowledge.json')
      .then(function(res) {
        if (!res.ok) throw new Error('load failed');
        return res.json();
      })
      .then(function(data) {
        knowledge = data;
      })
      .catch(function() {
        knowledge = {
          entries: [{
            id: 'contact',
            keywords: ['contact', 'email', 'phone'],
            text: 'contact email phone',
            answer: 'You can reach Akshat at akshat.sparikh@gmail.com or (408) 637-9861. He is based in San Jose, CA.'
          }]
        };
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
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
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
      el.textContent = 'Thinking…';
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

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() { setOpen(!isOpen); });
    }

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleQuestion(input ? input.value : '');
      });
    }

    if (isFull) {
      setOpen(true);
      appendMessage('bot', "Hi! I'm Akshat's portfolio assistant. Ask me about his experience, projects, skills, education, or how to get in touch.");
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
      '<button type="button" class="chat-toggle" aria-label="Open chat assistant" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>' +
        '<span>Ask Akshat</span>' +
      '</button>' +
      '<div class="chat-panel" role="dialog" aria-label="Portfolio assistant">' +
        '<div class="chat-panel-head">' +
          '<div><strong>Portfolio Assistant</strong><span>Answers from this site</span></div>' +
          '<button type="button" class="chat-close" aria-label="Close chat">&times;</button>' +
        '</div>' +
        '<div class="chat-messages" aria-live="polite"></div>' +
        '<div class="chat-starters"></div>' +
        '<form class="chat-form">' +
          '<input type="text" class="chat-input" placeholder="Ask about experience, projects, skills…" maxlength="500" autocomplete="off" aria-label="Your question">' +
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
