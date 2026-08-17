(function() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var canvas = document.getElementById('heroCanvas');
  var wrap = document.querySelector('.hero-scene-wrap');

  if (!canvas || reducedMotion || isMobile || typeof THREE === 'undefined') {
    if (wrap) wrap.classList.add('is-fallback');
    return;
  }

  var renderer, scene, camera, animationId;
  var mouse = { x: 0, y: 0 };
  var targetRot = { x: 0, y: 0 };
  var core, particles, lines;

  function init() {
    var width = wrap.clientWidth;
    var height = wrap.clientHeight;
    if (width < 1 || height < 1) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.z = 4.2;

    var accent = 0x3dbfb8;
    var accent2 = 0x6ee7de;

    core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 1),
      new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.85 })
    );
    scene.add(core);

    var inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: accent2, wireframe: true, transparent: true, opacity: 0.35 })
    );
    core.add(inner);

    var knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.35, 0.08, 64, 12),
      new THREE.MeshBasicMaterial({ color: accent2, wireframe: true, transparent: true, opacity: 0.25 })
    );
    knot.rotation.x = Math.PI / 3;
    core.add(knot);

    var count = 520;
    var positions = new Float32Array(count * 3);
    var i, radius, theta, phi;
    for (i = 0; i < count; i++) {
      radius = 1.2 + Math.random() * 1.4;
      theta = Math.random() * Math.PI * 2;
      phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    var particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({ color: accent2, size: 0.018, transparent: true, opacity: 0.75 })
    );
    scene.add(particles);

    var linePositions = [];
    var maxDist = 0.55;
    var pi, pj, dx, dy, dz, dist;
    for (pi = 0; pi < count; pi++) {
      for (pj = pi + 1; pj < count; pj++) {
        dx = positions[pi * 3] - positions[pj * 3];
        dy = positions[pi * 3 + 1] - positions[pj * 3 + 1];
        dz = positions[pi * 3 + 2] - positions[pj * 3 + 2];
        dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDist) {
          linePositions.push(
            positions[pi * 3], positions[pi * 3 + 1], positions[pi * 3 + 2],
            positions[pj * 3], positions[pj * 3 + 1], positions[pj * 3 + 2]
          );
        }
      }
    }
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.12 })
    );
    scene.add(lines);

    wrap.classList.remove('is-fallback');
    canvas.style.opacity = '0';

    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    animate();

    if (typeof gsap !== 'undefined') {
      gsap.to(canvas, { opacity: 1, duration: 1.4, delay: 0.3, ease: 'power2.out' });
    } else {
      canvas.style.opacity = '1';
    }
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onResize() {
    if (!renderer || !camera || !wrap) return;
    var width = wrap.clientWidth;
    var height = wrap.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    var t = performance.now() * 0.00035;

    targetRot.x += (mouse.y * 0.18 - targetRot.x) * 0.04;
    targetRot.y += (mouse.x * 0.22 - targetRot.y) * 0.04;

    if (core) {
      core.rotation.x = targetRot.x + Math.sin(t) * 0.08;
      core.rotation.y = targetRot.y + t * 0.6;
    }
    if (particles) {
      particles.rotation.y = -t * 0.25;
      particles.rotation.x = Math.sin(t * 0.7) * 0.05;
    }
    if (lines) lines.rotation.copy(particles.rotation);

    renderer.render(scene, camera);
  }

  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
    if (renderer) renderer.dispose();
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden && animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    } else if (!document.hidden && renderer) {
      animate();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }

  window.HeroScene = { destroy: destroy };
})();
