(function() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Active nav by page */
  var currentPage = document.body.getAttribute('data-page');
  if (currentPage === 'home') {
    document.querySelector('.nav-logo')?.classList.add('active');
  }
  document.querySelectorAll('.nav-links a[data-nav], .nav-resume[data-nav]').forEach(function(link) {
    if (link.getAttribute('data-nav') === currentPage) {
      link.classList.add('active');
    }
  });

  /* Mobile nav */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var navResume = document.querySelector('.nav-resume');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      navLinks.classList.toggle('open');
      if (navResume) navResume.classList.toggle('mobile-show');
    });
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
        if (navResume) navResume.classList.remove('mobile-show');
      });
    });
  }

  /* Resume page iframe */
  if (currentPage === 'resume') {
    var resumeFrame = document.getElementById('resumeFrame');
    if (resumeFrame) {
      resumeFrame.src = 'resume.pdf#toolbar=1&navpanes=0&view=FitH';
    }
  }

  /* Toast */
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 2200);
  }

  document.querySelectorAll('[data-copy]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      var text = el.getAttribute('data-copy');
      var label = el.getAttribute('data-copy-label') || 'Copied to clipboard';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        e.preventDefault();
        navigator.clipboard.writeText(text).then(function() {
          showToast(label);
        });
      }
    });
  });

  /* Scroll progress + nav shadow */
  var scrollProgress = document.getElementById('scrollProgress');
  var navbar = document.getElementById('navbar');
  function onScroll() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollProgress && docHeight > 0) {
      scrollProgress.style.width = (scrollTop / docHeight * 100) + '%';
    }
    if (navbar) navbar.classList.toggle('scrolled', scrollTop > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Reveal on scroll */
  if (!reducedMotion) {
    var revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { revealObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('visible'); });
  }

  /* Cursor glow */
  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    var glow = document.getElementById('cursorGlow');
    if (glow) {
      document.body.classList.add('cursor-on');
      document.addEventListener('mousemove', function(e) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      });
    }
  }

  /* Card spotlight + tilt */
  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    document.querySelectorAll('.card-box, .skill-group').forEach(function(card) {
      card.classList.add('tilt-ready');
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--spot-x', x + 'px');
        card.style.setProperty('--spot-y', y + 'px');
        if (!card.classList.contains('skill-group')) {
          var cx = rect.width / 2;
          var cy = rect.height / 2;
          var rotateX = ((y - cy) / cy) * -4;
          var rotateY = ((x - cx) / cx) * 4;
          card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-3px)';
        }
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
      });
    });
  }

  /* Magnetic buttons */
  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    document.querySelectorAll('.hero-connect-btn, .contact-tile:not(.static), .contact-bar-item, .project-link-labeled').forEach(function(btn) {
      btn.addEventListener('mousemove', function(e) {
        var rect = btn.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) * 0.12;
        var dy = (e.clientY - rect.top - rect.height / 2) * 0.12;
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
    });
  }

  /* Skill chip pop */
  document.querySelectorAll('.skill-group li').forEach(function(chip) {
    chip.addEventListener('click', function() {
      chip.classList.add('popped');
      var group = chip.closest('.skill-group');
      if (group) group.classList.add('active');
      setTimeout(function() {
        chip.classList.remove('popped');
        if (group) group.classList.remove('active');
      }, 600);
    });
  });

  /* Particles */
  if (!reducedMotion) {
    var canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var count = 48;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.5 + 0.5
      });
    }

    var mouse = { x: -9999, y: -9999 };
    document.addEventListener('mousemove', function(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.x -= dx * 0.008;
          p.y -= dy * 0.008;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,191,184,0.55)';
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var ddx = p.x - q.x;
          var ddy = p.y - q.y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(61,191,184,' + (0.18 * (1 - d / 130)) + ')';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }
})();
