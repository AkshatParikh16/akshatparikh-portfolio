window.Motion = (function() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastScroll = 0;
  var navHidden = false;

  function revealStatic() {
    document.querySelectorAll('.reveal, .hero-cinematic [data-motion]').forEach(function(el) {
      el.classList.add('visible');
      el.style.opacity = '';
      el.style.transform = '';
    });
  }

  function initHeroLoad() {
    if (document.body.getAttribute('data-page') !== 'home') return;

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    var nav = document.getElementById('navbar');
    var eyebrow = document.querySelector('.hero-eyebrow');
    var lines = document.querySelectorAll('.hero-display-title .hero-line');
    var tagline = document.querySelector('.hero-tagline');
    var cta = document.querySelector('.hero-cinematic .hero-connect-btn');
    var avatar = document.querySelector('.hero-avatar');
    var bottom = document.querySelector('.hero-bottom');

    if (nav) tl.fromTo(nav, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0);
    if (eyebrow) tl.fromTo(eyebrow, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.15);
    if (lines.length) tl.fromTo(lines, { y: 80, opacity: 0, rotateX: 12 }, { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.12 }, 0.25);
    if (bottom) tl.fromTo(bottom, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.65);
    if (tagline) tl.fromTo(tagline, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.7);
    if (cta) tl.fromTo(cta, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6 }, 0.85);
    if (avatar) tl.fromTo(avatar, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1);
  }

  function initScrollReveals() {
    gsap.utils.toArray('.reveal').forEach(function(el) {
      gsap.fromTo(el,
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    gsap.utils.toArray('.page-hero').forEach(function(el) {
      gsap.fromTo(el.querySelector('.page-hero__title'),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.1 }
      );
      var sub = el.querySelector('.page-hero__subtitle');
      if (sub) {
        gsap.fromTo(sub, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, delay: 0.25 });
      }
    });
  }

  function initNavBehavior() {
    var nav = document.getElementById('navbar');
    if (!nav) return;

    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      onUpdate: function(self) {
        nav.classList.toggle('scrolled', self.scroll() > 40);
      }
    });

    ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: function(self) {
        var current = self.scroll();
        if (current > 120 && current > lastScroll + 8 && !navHidden) {
          navHidden = true;
          gsap.to(nav, { y: -72, duration: 0.35, ease: 'power2.in' });
        } else if ((current < lastScroll - 8 || current < 80) && navHidden) {
          navHidden = false;
          gsap.to(nav, { y: 0, duration: 0.4, ease: 'power2.out' });
        }
        lastScroll = current;
      }
    });
  }

  function initContactBar() {
    var bar = document.querySelector('.contact-bar');
    var isHome = document.body.getAttribute('data-page') === 'home';
    if (!bar || !isHome) return;

    gsap.set(bar, { autoAlpha: 0, y: 20 });
    ScrollTrigger.create({
      trigger: '#skills',
      start: 'top 85%',
      onEnter: function() {
        gsap.to(bar, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        document.body.classList.add('contact-bar-visible');
      },
      onLeaveBack: function() {
        gsap.to(bar, { autoAlpha: 0, y: 20, duration: 0.35, ease: 'power2.in' });
        document.body.classList.remove('contact-bar-visible');
      }
    });
  }

  function initMagnetic() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.btn-glow, .hero-connect-btn, .contact-tile:not(.static)').forEach(function(btn) {
      btn.addEventListener('mousemove', function(e) {
        var rect = btn.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) * 0.15;
        var dy = (e.clientY - rect.top - rect.height / 2) * 0.15;
        gsap.to(btn, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function() {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  function initPageTransition() {
    if (!document.startViewTransition) return;
    document.querySelectorAll('a[href]').forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === 0 || link.target === '_blank' || href.indexOf('mailto:') === 0) return;
      if (href.indexOf('.html') === -1 && href.indexOf('http') !== 0) return;
      if (href.indexOf('http') === 0 && href.indexOf(location.origin) !== 0) return;

      link.addEventListener('click', function(e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        document.startViewTransition(function() {
          window.location.href = href;
        });
      });
    });
  }

  function initChatEntrance() {
    function animateChat() {
      var chat = document.getElementById('portfolio-chat');
      if (!chat || chat.getAttribute('data-mode') !== 'widget') return false;
      gsap.fromTo(chat, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, delay: 0.4, ease: 'power2.out' });
      return true;
    }
    if (animateChat()) return;
    var attempts = 0;
    var timer = setInterval(function() {
      if (animateChat() || ++attempts > 30) clearInterval(timer);
    }, 100);
  }

  function init() {
    if (reducedMotion || typeof gsap === 'undefined') {
      revealStatic();
      return;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    initHeroLoad();
    initScrollReveals();
    initNavBehavior();
    initContactBar();
    initMagnetic();
    initPageTransition();
    initChatEntrance();
  }

  return { init: init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { window.Motion.init(); });
} else {
  window.Motion.init();
}
