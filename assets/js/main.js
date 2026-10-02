import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('.form-status');

const updateHeader = () => {
  header.classList.toggle('scrolled', window.scrollY > 18);
  document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
};
const depthElements = [...document.querySelectorAll('.profile-image, .project-art, .process-visual')];
let depthFrameRequested = false;
let sceneScrollProgress = 0;

function updateScrollDepth() {
  depthFrameRequested = false;
  updateHeader();
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pageProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  document.documentElement.style.setProperty('--page-progress', `${(pageProgress * 100).toFixed(2)}%`);
  if (reducedMotion) return;

  const viewportCenter = window.innerHeight / 2;
  depthElements.forEach((element) => {
    const bounds = element.getBoundingClientRect();
    const distance = (bounds.top + bounds.height / 2 - viewportCenter) / (window.innerHeight + bounds.height / 2);
    const depth = Math.max(-1, Math.min(1, distance));
    element.style.setProperty('--scroll-depth', depth.toFixed(3));
  });

  const hero = document.querySelector('.hero');
  const heroBounds = hero.getBoundingClientRect();
  sceneScrollProgress = Math.max(0, Math.min(1, -heroBounds.top / heroBounds.height));
}

function scheduleScrollDepth() {
  if (!depthFrameRequested) {
    depthFrameRequested = true;
    requestAnimationFrame(updateScrollDepth);
  }
}

window.addEventListener('scroll', scheduleScrollDepth, { passive: true });
window.addEventListener('resize', scheduleScrollDepth, { passive: true });
updateScrollDepth();

const mobileDockLinks = [...document.querySelectorAll('.mobile-dock a')];
function updateMobileDockActive() {
  const marker = window.innerHeight * .42;
  const sections = mobileDockLinks.map((link) => ({
    link,
    bounds: document.querySelector(link.hash)?.getBoundingClientRect()
  })).filter((item) => item.bounds);
  const active = sections.find(({ bounds }) => marker >= bounds.top && marker < bounds.bottom)
    ?? sections.reduce((closest, item) => {
      const distance = Math.abs((item.bounds.top + item.bounds.bottom) / 2 - marker);
      return distance < closest.distance ? { ...item, distance } : closest;
    }, { ...sections[0], distance: Infinity });

  mobileDockLinks.forEach((link) => {
    const isActive = link === active.link;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', updateMobileDockActive, { passive: true });
window.addEventListener('resize', updateMobileDockActive, { passive: true });
updateMobileDockActive();

document.querySelectorAll('#portfolio-nav a').forEach((link) => link.addEventListener('click', (event) => {
  const navElement = document.querySelector('#portfolio-nav');
  if (!navElement.classList.contains('show') || !window.bootstrap?.Collapse) return;

  event.preventDefault();
  const navInstance = window.bootstrap.Collapse.getOrCreateInstance(navElement);
  navElement.addEventListener('hidden.bs.collapse', () => {
    updateHeader();
    history.pushState(null, '', link.hash);
    document.querySelector(link.hash)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, { once: true });
  navInstance.hide();
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -7% 0px' });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const customCursor = document.querySelector('.custom-cursor');
if (customCursor && canHover && !reducedMotion) {
  const cursorLabel = customCursor.querySelector('.custom-cursor-label');
  document.body.classList.add('custom-cursor-enabled');

  document.addEventListener('pointermove', (event) => {
    customCursor.style.setProperty('--cursor-x', `${event.clientX}px`);
    customCursor.style.setProperty('--cursor-y', `${event.clientY}px`);
    customCursor.classList.add('is-visible');
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('a, button, input, textarea, select, [contenteditable="true"]');
    const isTextControl = target?.matches('input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]');
    const label = target?.closest('.project-art') ? 'VIEW' : target?.matches('.button, button') ? 'GO' : '';
    customCursor.classList.toggle('is-hidden', Boolean(isTextControl));
    customCursor.classList.toggle('is-hovering', Boolean(target && !isTextControl));
    customCursor.classList.toggle('has-label', Boolean(label));
    cursorLabel.textContent = label;
  });

  document.addEventListener('pointerout', (event) => {
    if (event.relatedTarget === null) customCursor.classList.remove('is-visible');
  });
}

if (canHover && !reducedMotion) {
  document.querySelectorAll('.project-art, .button').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      element.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      element.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });

  document.querySelectorAll('.project').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      element.style.setProperty('--tilt-x', `${-y * 3}deg`);
      element.style.setProperty('--tilt-y', `${x * 3}deg`);
    }, { passive: true });
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
    });
  });
}

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!contactForm.checkValidity()) {
    formStatus.textContent = 'Please complete all required fields.';
    contactForm.reportValidity();
    return;
  }
  formStatus.textContent = 'Thanks. Your project details have been recorded.';
  contactForm.reset();
});

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 8);
const sculpture = new THREE.Group();
scene.add(sculpture);

const material = new THREE.MeshPhysicalMaterial({ color: 0x12c9d1, metalness: 0.22, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.12 });
const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.52, 5), material);
body.scale.set(1, 1.15, 1);
sculpture.add(body);

const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 3), new THREE.MeshBasicMaterial({ color: 0xa8df12, wireframe: true, transparent: true, opacity: 0.24 }));
sculpture.add(shell);

const rings = [
  new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.025, 8, 128), new THREE.MeshBasicMaterial({ color: 0xffd21c, transparent: true, opacity: 0.78 })),
  new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.014, 8, 128), new THREE.MeshBasicMaterial({ color: 0x12c9d1, transparent: true, opacity: 0.58 })),
  new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.01, 8, 128), new THREE.MeshBasicMaterial({ color: 0xa8df12, transparent: true, opacity: 0.4 }))
];
rings[0].rotation.set(.92, .2, -.46); rings[1].rotation.set(-.72, .5, .52); rings[2].rotation.set(.2, -.75, .4);
rings.forEach((ring) => sculpture.add(ring));

const dustGeometry = new THREE.BufferGeometry();
const dustPoints = new Float32Array(520 * 3);
for (let i = 0; i < dustPoints.length; i += 3) {
  const radius = 2.15 + Math.random() * 1.6;
  const angle = Math.random() * Math.PI * 2;
  const height = (Math.random() - .5) * 5.5;
  dustPoints[i] = Math.cos(angle) * radius;
  dustPoints[i + 1] = height;
  dustPoints[i + 2] = Math.sin(angle) * radius;
}
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPoints, 3));
const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xa8df12, size: 0.025, transparent: true, opacity: 0.78 }));
sculpture.add(dust);

scene.add(new THREE.HemisphereLight(0xdfffe7, 0x10283a, 1.7));
const warmLight = new THREE.PointLight(0xffd21c, 36, 12); warmLight.position.set(3.2, 2, 4); scene.add(warmLight);
const coolLight = new THREE.PointLight(0x12c9d1, 28, 11); coolLight.position.set(-3.5, -2.5, 3); scene.add(coolLight);

let pointerX = 0;
let pointerY = 0;
let sceneVerticalOffset = 0;
window.addEventListener('pointermove', (event) => {
  pointerX = event.clientX / window.innerWidth - .5;
  pointerY = event.clientY / window.innerHeight - .5;
}, { passive: true });

function resizeScene() {
  const bounds = canvas.getBoundingClientRect();
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  const isMobile = bounds.width < 760;
  sculpture.position.x = isMobile ? 1.1 : 1.45;
  sceneVerticalOffset = isMobile ? -1.4 : 0;
  sculpture.scale.setScalar(isMobile ? 0.3 : 1);
}
window.addEventListener('resize', resizeScene);
resizeScene();

const clock = new THREE.Clock();
let sceneVisible = false;
let frameRequested = false;
const sceneObserver = new IntersectionObserver(([entry]) => {
  sceneVisible = entry.isIntersecting;
  if (sceneVisible) requestFrame();
}, { threshold: 0 });
sceneObserver.observe(canvas);

function requestFrame() {
  if (!frameRequested && !document.hidden && sceneVisible && !reducedMotion) {
    frameRequested = true;
    requestAnimationFrame(animate);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && sceneVisible && !reducedMotion) requestFrame();
});

function animate() {
  frameRequested = false;
  const time = clock.getElapsedTime();
  if (!reducedMotion) {
    sculpture.rotation.y += (pointerX * .42 + sceneScrollProgress * 1.45 - sculpture.rotation.y) * .045;
    sculpture.rotation.x += (-pointerY * .25 + sceneScrollProgress * .62 - sculpture.rotation.x) * .045;
    sculpture.rotation.z += (sceneScrollProgress * .36 - sculpture.rotation.z) * .045;
    sculpture.position.y += (sceneVerticalOffset + sceneScrollProgress * .82 - sculpture.position.y) * .045;
    body.rotation.y += .0025;
    shell.rotation.y -= .003;
    rings[0].rotation.z += .0024;
    rings[1].rotation.z -= .0016;
    rings[2].rotation.x += .001;
    dust.rotation.y = time * .045;
    body.scale.setScalar(1 + Math.sin(time * 1.15) * .018);
  }
  renderer.render(scene, camera);
  requestFrame();
}
renderer.render(scene, camera);
requestFrame();
