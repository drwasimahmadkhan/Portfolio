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
const navbar = document.getElementById('navbar');

function closeMobileMenu() {
  if (!mobileMenu || !navbar) return;
  mobileMenu.classList.add('hidden');
  navbar.classList.remove('nav-menu-open');
  if (mobileBtn) {
    mobileBtn.classList.remove('is-open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.setAttribute('aria-label', 'Open menu');
  }
}

if (mobileBtn && mobileMenu && navbar) {
  mobileBtn.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.toggle('hidden');
    const isOpen = !isHidden;
    navbar.classList.toggle('nav-menu-open', isOpen);
    mobileBtn.classList.toggle('is-open', isOpen);
    mobileBtn.setAttribute('aria-expanded', String(isOpen));
    mobileBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
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
  }, 4500);
}

function ensureHttpServer() {
  if (typeof window.isPortfolioFileProtocol === 'function' && window.isPortfolioFileProtocol()) {
    throw new Error(window.getPortfolioServerMessage());
  }
}

function clearFormErrors(form) {
  form.querySelectorAll('.booking-input-error').forEach(el => el.classList.remove('booking-input-error'));
  document.querySelectorAll('.catalyst-card.package-error').forEach(card => card.classList.remove('package-error'));
  document.getElementById('preferred-date-trigger')?.classList.remove('booking-input-error');
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

  const dateTrigger = document.getElementById('preferred-date-trigger');
  if (dateTrigger && !form.querySelector('[name="preferred_date"]')?.value.trim()) {
    valid = false;
    dateTrigger.classList.add('booking-input-error');
  }

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

function updateLiveCanvas(card) {
  const title = card?.dataset?.title || '';
  const duration = card?.dataset?.duration || '';
  const vision = card?.dataset?.vision || '';

  document.querySelectorAll('#live-canvas').forEach((canvas) => {
    const empty = canvas.querySelector('#canvas-empty');
    const filled = canvas.querySelector('#canvas-filled');
    const titleEl = canvas.querySelector('#canvas-title');
    const durationEl = canvas.querySelector('#canvas-duration');
    const visionEl = canvas.querySelector('#canvas-vision');

    if (empty && filled && titleEl && durationEl) {
      if (title) {
        empty.classList.add('hidden');
        filled.classList.remove('hidden');
      }
      titleEl.textContent = title;
      durationEl.textContent = duration;
      if (visionEl) visionEl.textContent = vision;
      return;
    }

    if (title) {
      canvas.innerHTML = `
        <div class="font-medium">${title}</div>
        <div class="text-xs mt-1 text-muted">${duration}</div>
      `;
    }
  });

  updateSessionTicket();
}

function setCanvasRow(rowId, valueId, value) {
  const row = document.getElementById(rowId);
  const el = document.getElementById(valueId);
  if (!row || !el) return;

  if (value) {
    row.classList.remove('hidden');
    el.textContent = value;
  } else {
    row.classList.add('hidden');
    el.textContent = '';
  }
}

function updateSessionTicket() {
  const form = document.getElementById('booking-form-blueprint');
  if (!form) return;

  const getValue = (name) => form.querySelector(`[name="${name}"]`)?.value.trim() || '';
  const packageName = getValue('selected_package');
  const selectedCard = document.querySelector('.catalyst-card.selected');
  const duration = selectedCard?.dataset?.duration || '';
  const vision = selectedCard?.dataset?.vision || getValue('topic');

  const canvas = document.getElementById('live-canvas');
  const empty = canvas?.querySelector('#canvas-empty');
  const filled = canvas?.querySelector('#canvas-filled');

  const hasTicketData = Boolean(
    packageName ||
    getValue('full_name') ||
    getValue('organization') ||
    getValue('email') ||
    getValue('preferred_date')
  );

  if (empty && filled) {
    if (hasTicketData) {
      empty.classList.add('hidden');
      filled.classList.remove('hidden');
    } else {
      empty.classList.remove('hidden');
      filled.classList.add('hidden');
    }
  }

  const titleEl = document.getElementById('canvas-title');
  const durationEl = document.getElementById('canvas-duration');
  const visionEl = document.getElementById('canvas-vision');

  if (titleEl) titleEl.textContent = packageName || 'Your session blueprint';
  if (durationEl) durationEl.textContent = duration || 'Flexible';
  if (visionEl) visionEl.textContent = vision || 'Tell us what you want to explore together.';

  const phone = getValue('phone');
  const email = getValue('email');
  const contact = [email, phone].filter(Boolean).join(' · ');

  setCanvasRow('canvas-row-name', 'canvas-name', getValue('full_name'));
  setCanvasRow('canvas-row-org', 'canvas-org', getValue('organization'));
  setCanvasRow('canvas-row-contact', 'canvas-contact', contact);

  const date = getValue('preferred_date');
  const time = getValue('preferred_time');
  let schedule = '';
  if (date && time) {
    const displayDate = new Date(`${date}T${time}:00`).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    schedule = displayDate;
  } else if (date) {
    schedule = date;
  }
  setCanvasRow('canvas-row-schedule', 'canvas-schedule', schedule);
  setCanvasRow('canvas-row-mode', 'canvas-mode', getValue('mode'));
}

window.updateSessionTicket = updateSessionTicket;

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
  setText('voucher-date', (() => {
    const date = getValue('preferred_date');
    const time = getValue('preferred_time');
    if (!date) return '';
    if (!time) return date;
    return new Date(`${date}T${time}:00`).toLocaleString();
  })());
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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateBookingForm(form)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const originalLabel = submitBtn?.innerHTML;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Scheduling...</span>';
    }

    const payload = {
      full_name: form.querySelector('[name="full_name"]')?.value.trim(),
      email: form.querySelector('[name="email"]')?.value.trim(),
      phone: form.querySelector('[name="phone"]')?.value.trim(),
      organization: form.querySelector('[name="organization"]')?.value.trim(),
      selected_package: form.querySelector('[name="selected_package"]')?.value.trim(),
      preferred_date: form.querySelector('[name="preferred_date"]')?.value.trim(),
      preferred_time: form.querySelector('[name="preferred_time"]')?.value.trim(),
      mode: form.querySelector('[name="mode"]')?.value.trim(),
      topic: form.querySelector('[name="topic"]')?.value.trim(),
      participants: form.querySelector('[name="participants"]')?.value.trim(),
      additional_notes: form.querySelector('[name="additional_notes"]')?.value.trim(),
      duration_minutes: Number(form.querySelector('[name="duration_minutes"]')?.value || 120),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      ensureHttpServer();

      const response = await fetch('api/book.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Unable to book this session.');
      }

      const ref = data.booking_id || ('AT-' + Math.floor(100000 + Math.random() * 900000));
      populateVoucher(form, ref);
      showVoucher();
      showBookingToast(data.message || 'Your session has been booked.');

      if (typeof window.refreshAtelierCalendar === 'function') {
        window.refreshAtelierCalendar({ force: true });
      }

      if (!data.google_synced && data.sync_error) {
        console.warn('Google Calendar sync:', data.sync_error);
      }
    } catch (error) {
      showBookingToast(error.message || 'Unable to book this session.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    }
  });
}

function initAtelier() {
  let calendarRefreshTimer = null;

  const scheduleCalendarRefresh = () => {
    clearTimeout(calendarRefreshTimer);
    calendarRefreshTimer = setTimeout(() => {
      if (typeof window.refreshAtelierCalendar === 'function') {
        window.refreshAtelierCalendar({ force: true });
      }
    }, 250);
  };

  document.querySelectorAll('.catalyst-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.catalyst-card').forEach(c => {
        c.classList.remove('selected', 'package-error');
      });
      card.classList.add('selected');

      const title = card.dataset.title;
      const durationMinutes = card.dataset.durationMinutes || '120';

      document.querySelectorAll('[name="selected_package"]').forEach(input => {
        input.value = title;
      });

      const packageIdInput = document.getElementById('selected_package_id');
      if (packageIdInput) packageIdInput.value = card.dataset.packageId || '';

      const durationInput = document.getElementById('duration_minutes');
      if (durationInput) durationInput.value = durationMinutes;

      updateLiveCanvas(card);
    });
  });

  const blueprintForm = document.getElementById('booking-form-blueprint');
  if (blueprintForm) {
    initBookingForm(blueprintForm);
    blueprintForm.querySelectorAll('input, select, textarea, button').forEach((field) => {
      field.addEventListener('input', updateSessionTicket);
      field.addEventListener('change', updateSessionTicket);
      field.addEventListener('focus', scheduleCalendarRefresh);
    });
  }

  const atelierSection = document.getElementById('atelier');
  if (atelierSection && 'IntersectionObserver' in window) {
    const atelierObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) scheduleCalendarRefresh();
      });
    }, { threshold: 0.2 });
    atelierObserver.observe(atelierSection);
  }

  scheduleCalendarRefresh();

  document.querySelectorAll('#booking-form').forEach(form => {
    initBookingForm(form);
  });

  updateSessionTicket();
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
    }
  });

  const preferredDateLabel = document.getElementById('preferred-date-label');
  if (preferredDateLabel) {
    preferredDateLabel.textContent = 'Select date & time';
    preferredDateLabel.classList.add('text-muted');
  }

  updateSessionTicket();
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
  const CURSOR_RADIUS = 10;
  const TRAIL_SIZE = 5;
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
    particles.push({ x, y, life: 24 });
  });

  function draw() {
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    ctx.fillStyle = 'rgba(99,102,241,0.18)';
    ctx.beginPath();
    ctx.arc(x, y, CURSOR_RADIUS + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(99,102,241,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, CURSOR_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, CURSOR_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      ctx.globalAlpha = p.life / 24;
      ctx.fillStyle = '#818cf8';
      const size = TRAIL_SIZE * (p.life / 24);
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}