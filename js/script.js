// =====================================================
// DESIGNER THEME - Clean JS
// =====================================================

const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

// Theme
function setTheme(theme) {
  if (theme === 'dark') {
    html.classList.add('theme-dark', 'dark');
    html.classList.remove('theme-light');
    if (themeToggle) themeToggle.textContent = 'Light';
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.add('theme-light');
    html.classList.remove('theme-dark', 'dark');
    if (themeToggle) themeToggle.textContent = 'Dark';
    localStorage.setItem('theme', 'light');
  }
}

setTheme(localStorage.getItem('theme') || 'light');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTheme(html.classList.contains('theme-dark') ? 'light' : 'dark');
  });
}

// Mobile Menu
const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}

// Gallery Filters
document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.style.display = (filter === 'all' || item.dataset.category === filter) ? '' : 'none';
    });
  });
});

// =====================================================
// THE ATELIER - Booking
// =====================================================

function showBookingToast(message) {
  let toast = document.querySelector('.booking-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'booking-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'flex';
  clearTimeout(showBookingToast._timer);
  showBookingToast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function clearFormErrors(form) {
  form.querySelectorAll('.booking-input-error').forEach(el => el.classList.remove('booking-input-error'));
  document.querySelectorAll('.catalyst-card.package-error').forEach(card => card.classList.remove('package-error'));
}

function validateBookingForm(form) {
  clearFormErrors(form);

  let valid = true;
  const packageInput = form.querySelector('[name="selected_package"]');
  const selectedPackage = packageInput?.value.trim();

  if (!selectedPackage) {
    valid = false;
    document.querySelectorAll('.catalyst-card').forEach(card => card.classList.add('package-error'));
  }

  form.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
    if (!field.value.trim()) {
      valid = false;
      field.classList.add('booking-input-error');
    }
  });

  const emailField = form.querySelector('[name="email"]');
  if (emailField?.value.trim() && !emailField.checkValidity()) {
    valid = false;
    emailField.classList.add('booking-input-error');
  }

  if (!valid) {
    showBookingToast('Please select a session format and complete all required fields.');
    const firstInvalid = form.querySelector('.booking-input-error') || document.querySelector('.catalyst-card.package-error');
    firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function updateLiveCanvas(title, duration) {
  document.querySelectorAll('#live-canvas').forEach(canvas => {
    const empty = canvas.querySelector('#canvas-empty');
    const filled = canvas.querySelector('#canvas-filled');
    const titleEl = canvas.querySelector('#canvas-title');
    const durationEl = canvas.querySelector('#canvas-duration');

    if (empty && filled && titleEl && durationEl) {
      empty.classList.add('hidden');
      filled.classList.remove('hidden');
      titleEl.textContent = title;
      durationEl.textContent = duration;
      return;
    }

    canvas.innerHTML = `
      <div class="font-medium">${title}</div>
      <div class="text-xs mt-1 text-muted">${duration}</div>
    `;
  });
}

function populateVoucher(form, ref) {
  const getValue = (name) => form.querySelector(`[name="${name}"]`)?.value.trim() || '';

  const setText = (id, value) => {
    document.querySelectorAll(`#${id}`).forEach(el => {
      el.textContent = value;
    });
  };

  setText('voucher-ref', ref);
  setText('voucher-package', getValue('selected_package'));
  setText('voucher-name', getValue('full_name'));
  setText('voucher-email', getValue('email'));
  setText('voucher-phone', getValue('phone'));
  setText('voucher-org', getValue('organization'));
  setText('voucher-date', getValue('preferred_date'));
  setText('voucher-mode', getValue('mode'));
  setText('voucher-topic', getValue('topic'));
}

function showVoucher() {
  document.querySelectorAll('#booking-voucher').forEach(voucher => {
    voucher.classList.remove('hidden');
    voucher.style.display = '';
    voucher.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function initBookingForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateBookingForm(form)) return;

    const ref = 'AT-' + Math.floor(100000 + Math.random() * 900000);
    populateVoucher(form, ref);
    showVoucher();
    showBookingToast('Your session request has been created.');
  });
}

function initAtelier() {
  document.querySelectorAll('.catalyst-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.catalyst-card').forEach(c => {
        c.classList.remove('selected', 'package-error');
      });
      card.classList.add('selected');

      const title = card.dataset.title;
      const duration = card.dataset.duration;

      document.querySelectorAll('[name="selected_package"]').forEach(input => {
        input.value = title;
      });

      updateLiveCanvas(title, duration);
    });
  });

  document.querySelectorAll('#booking-form, #booking-form-blueprint').forEach(form => {
    initBookingForm(form);
  });
}

function resetBookingFormAndVoucher() {
  document.querySelectorAll('#booking-form, #booking-form-blueprint').forEach(form => {
    form.reset();
    clearFormErrors(form);
  });

  document.querySelectorAll('[name="selected_package"]').forEach(input => {
    input.value = '';
  });

  document.querySelectorAll('.catalyst-card').forEach(card => card.classList.remove('selected', 'package-error'));

  document.querySelectorAll('#booking-voucher').forEach(voucher => {
    voucher.classList.add('hidden');
    voucher.style.display = 'none';
  });

  document.querySelectorAll('#live-canvas').forEach(canvas => {
    const empty = canvas.querySelector('#canvas-empty');
    const filled = canvas.querySelector('#canvas-filled');
    if (empty && filled) {
      empty.classList.remove('hidden');
      filled.classList.add('hidden');
      return;
    }
    canvas.innerHTML = '<div id="canvas-empty">Select a format above to begin.</div>';
  });
}

function printVoucher() {
  window.print();
}

function copyVoucherDetails() {
  const voucher = document.querySelector('#booking-voucher:not(.hidden)');
  if (!voucher) return;

  const text = [
    document.querySelector('#voucher-ref')?.textContent,
    document.querySelector('#voucher-package')?.textContent,
    document.querySelector('#voucher-name')?.textContent,
    document.querySelector('#voucher-email')?.textContent,
    document.querySelector('#voucher-phone')?.textContent,
  ].filter(Boolean).join('\n');

  navigator.clipboard?.writeText(text).then(() => {
    showBookingToast('Pass details copied to clipboard.');
  });
}

function emailBookingDetails() {
  const email = document.querySelector('#voucher-email')?.textContent || '';
  const ref = document.querySelector('#voucher-ref')?.textContent || '';
  const pkg = document.querySelector('#voucher-package')?.textContent || '';
  const subject = encodeURIComponent(`Catalyst Atelier Request ${ref}`);
  const body = encodeURIComponent(`Session: ${pkg}\nReference: ${ref}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

window.resetBookingFormAndVoucher = resetBookingFormAndVoucher;
window.printVoucher = printVoucher;
window.copyVoucherDetails = copyVoucherDetails;
window.emailBookingDetails = emailBookingDetails;

document.addEventListener('DOMContentLoaded', () => {
  initAtelier();
});

// Three.js background (kept for visual interest)
const tCanvas = document.getElementById('three-canvas');
if (tCanvas && typeof THREE !== 'undefined') {
  // minimal three.js setup (kept from original for artistic feel)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas: tCanvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(600 * 3);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ size: 0.05, color: 0x6366f1 });
  const points = new THREE.Points(particles, material);
  scene.add(points);
  camera.position.z = 8;

  function animate() {
    requestAnimationFrame(animate);
    points.rotation.y += 0.0005;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Cursor effect (light version)
const cursorCanvas = document.getElementById('cursor-canvas');
if (cursorCanvas && window.matchMedia('(pointer: fine)').matches) {
  const ctx = cursorCanvas.getContext('2d');
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  const particles = [];

  function resize() {
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    particles.push({ x, y, life: 20 });
  });

  function draw() {
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    ctx.fillStyle = 'rgba(99,102,241,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      ctx.globalAlpha = p.life / 20;
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
    requestAnimationFrame(draw);
  }
  draw();
}