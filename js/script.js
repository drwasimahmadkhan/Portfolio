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

// Gallery slider — infinite loop + autoplay
function initGallerySlider() {
  const slider = document.querySelector('[data-gallery-slider]');
  const track = document.querySelector('[data-gallery-track]');
  const prevBtn = document.querySelector('[data-gallery-prev]');
  const nextBtn = document.querySelector('[data-gallery-next]');

  if (!slider || !track) return;

  const originals = Array.from(track.querySelectorAll('.gallery-slide'));
  if (!originals.length) return;

  // Duplicate slides so the strip can wrap seamlessly
  originals.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('gallery-slide--clone');
    track.appendChild(clone);
  });

  const getGap = () => {
    const styles = window.getComputedStyle(track);
    return parseFloat(styles.columnGap || styles.gap || '12') || 12;
  };

  const getStep = () => {
    const slide = track.querySelector('.gallery-slide');
    if (!slide) return track.clientWidth * 0.8;
    return slide.getBoundingClientRect().width + getGap();
  };

  const getSetWidth = () => {
    return originals.reduce((sum, slide) => {
      return sum + slide.getBoundingClientRect().width;
    }, 0) + getGap() * originals.length;
  };

  let isJumping = false;
  let isDragging = false;
  let isProgrammatic = false;
  let autoplayTimer = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const withoutSmooth = (fn) => {
    const prev = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    track.classList.add('is-jumping');
    fn();
    void track.scrollLeft;
    track.classList.remove('is-jumping');
    track.style.scrollBehavior = prev || '';
  };

  const normalizeLoop = () => {
    if (isJumping) return;
    const setWidth = getSetWidth();
    if (setWidth <= 0) return;

    // Keep scroll inside the first copy; clones make the wrap seamless
    if (track.scrollLeft >= setWidth - 1) {
      isJumping = true;
      withoutSmooth(() => {
        track.scrollLeft -= setWidth;
      });
      isJumping = false;
    }
  };

  const scrollByStep = (direction) => {
    const setWidth = getSetWidth();
    const step = getStep();
    isProgrammatic = true;

    // Going left past the start → jump into the cloned set first
    if (direction < 0 && track.scrollLeft < step + 1) {
      withoutSmooth(() => {
        track.scrollLeft += setWidth;
      });
    }

    track.scrollBy({ left: direction * step, behavior: 'smooth' });

    window.setTimeout(() => {
      normalizeLoop();
      isProgrammatic = false;
    }, 480);
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const startAutoplay = () => {
    if (prefersReducedMotion) return;
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      if (isDragging || document.hidden || isProgrammatic) return;
      scrollByStep(1);
    }, 2000);
  };

  prevBtn?.addEventListener('click', () => {
    scrollByStep(-1);
    startAutoplay();
  });
  nextBtn?.addEventListener('click', () => {
    scrollByStep(1);
    startAutoplay();
  });

  let startX = 0;
  let scrollLeft = 0;

  track.addEventListener('pointerdown', (event) => {
    isDragging = true;
    stopAutoplay();
    startX = event.clientX;
    scrollLeft = track.scrollLeft;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    track.scrollLeft = scrollLeft - delta;

    const setWidth = getSetWidth();
    if (setWidth <= 0) return;

    if (track.scrollLeft >= setWidth) {
      track.scrollLeft -= setWidth;
      scrollLeft = track.scrollLeft;
      startX = event.clientX;
    } else if (track.scrollLeft <= 0) {
      track.scrollLeft += setWidth;
      scrollLeft = track.scrollLeft;
      startX = event.clientX;
    }
  });

  const endDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    if (event?.pointerId != null) {
      try { track.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    normalizeLoop();
    startAutoplay();
  };

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', endDrag);

  track.addEventListener('scroll', () => {
    if (!isDragging && !isJumping && !isProgrammatic) normalizeLoop();
  }, { passive: true });

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  window.addEventListener('resize', () => {
    normalizeLoop();
  });

  document.querySelectorAll('.gallery-slide-image').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      img.classList.add('is-missing');
    }
  });

  // Start mid-safe at the real first slide
  withoutSmooth(() => {
    track.scrollLeft = 0;
  });
  startAutoplay();
}

document.addEventListener('DOMContentLoaded', initGallerySlider);

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

function initCustomSelects(root = document) {
  root.querySelectorAll('select.js-custom-select').forEach((select) => {
    if (select.dataset.customized === 'true') return;
    select.dataset.customized = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueEl = document.createElement('span');
    valueEl.className = 'custom-select__value is-placeholder';

    const chevron = document.createElement('span');
    chevron.className = 'custom-select__chevron';
    chevron.setAttribute('aria-hidden', 'true');

    trigger.append(valueEl, chevron);

    const menu = document.createElement('div');
    menu.className = 'custom-select__menu';
    menu.setAttribute('role', 'listbox');

    const syncTrigger = () => {
      const option = select.selectedOptions[0];
      const label = option?.textContent?.trim() || select.options[0]?.textContent?.trim() || '';
      valueEl.textContent = label;
      valueEl.classList.toggle('is-placeholder', !select.value);
      menu.querySelectorAll('.custom-select__option').forEach((btn) => {
        btn.classList.toggle('is-selected', btn.dataset.value === select.value);
      });
    };

    Array.from(select.options).forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'custom-select__option' + (option.value === '' ? ' is-placeholder' : '');
      btn.dataset.value = option.value;
      btn.textContent = option.textContent;
      btn.setAttribute('role', 'option');
      btn.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        syncTrigger();
      });
      menu.appendChild(btn);
    });

    select.classList.add('custom-select__native');
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select, trigger, menu);
    syncTrigger();

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const willOpen = !wrapper.classList.contains('is-open');
      document.querySelectorAll('.custom-select.is-open').forEach((el) => {
        if (el !== wrapper) {
          el.classList.remove('is-open');
          el.querySelector('.custom-select__trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
      wrapper.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    select.addEventListener('invalid', () => wrapper.classList.add('is-error'));
    select.addEventListener('change', () => {
      wrapper.classList.remove('is-error');
      syncTrigger();
    });
  });

  if (!initCustomSelects._bound) {
    initCustomSelects._bound = true;
    document.addEventListener('click', (event) => {
      if (event.target.closest('.custom-select')) return;
      document.querySelectorAll('.custom-select.is-open').forEach((el) => {
        el.classList.remove('is-open');
        el.querySelector('.custom-select__trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.custom-select.is-open').forEach((el) => {
        el.classList.remove('is-open');
        el.querySelector('.custom-select__trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

function clearFormErrors(form) {
  form.querySelectorAll('.booking-input-error').forEach(el => el.classList.remove('booking-input-error'));
  document.getElementById('preferred-date-trigger')?.classList.remove('booking-input-error');
  form.querySelectorAll('.custom-select.is-error').forEach(el => el.classList.remove('is-error'));
}

function validateBookingForm(form) {
  clearFormErrors(form);

  let valid = true;
  const packageInput = form.querySelector('[name="selected_package"]');
  const selectedPackage = packageInput?.value.trim();

  if (!selectedPackage) {
    valid = false;
    packageInput?.classList.add('booking-input-error');
    packageInput?.closest('.custom-select')?.classList.add('is-error');
  }

  form.querySelectorAll('input[required], select[required], textarea[required]').forEach(field => {
    if (!field.value.trim()) {
      valid = false;
      field.classList.add('booking-input-error');
      field.closest('.custom-select')?.classList.add('is-error');
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
    showBookingToast('Please select a session type and complete all required fields.');
    const firstInvalid = form.querySelector('.custom-select.is-error .custom-select__trigger, .booking-input-error');
    firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

const SESSION_PACKAGES = {
  'AI Awareness Talk': {
    id: 'awareness-talk',
    duration: '1–2 hours',
    durationMinutes: '120',
    vision: 'An inspiring ignition for curious minds. Plant the seeds of possibility.',
  },
  'Generative AI Workshop': {
    id: 'genai-workshop',
    duration: '2–4 hours',
    durationMinutes: '180',
    vision: 'Hands-on creation. Build real tools, break assumptions, leave with working prototypes.',
  },
  'Corporate AI Training': {
    id: 'corporate-training',
    duration: 'Half / Full day',
    durationMinutes: '480',
    vision: 'Transform how entire teams think. Strategic depth + practical capability in one powerful day.',
  },
  'AI Consultancy Session': {
    id: 'consultancy',
    duration: '60–120 min',
    durationMinutes: '90',
    vision: 'High-signal advisory. Architecture, strategy, and clarity when it matters most.',
  },
  'Custom Session': {
    id: 'custom-session',
    duration: 'Flexible',
    durationMinutes: '120',
    vision: 'You bring the challenge. We invent the format together.',
  },
};

function applySelectedPackage(selectEl) {
  const option = selectEl?.selectedOptions?.[0];
  const title = selectEl?.value.trim() || '';
  const meta = SESSION_PACKAGES[title] || {};

  const packageId = option?.dataset.packageId || meta.id || '';
  const duration = option?.dataset.duration || meta.duration || '';
  const durationMinutes = option?.dataset.durationMinutes || meta.durationMinutes || '120';
  const vision = option?.dataset.vision || meta.vision || '';

  const packageIdInput = document.getElementById('selected_package_id');
  if (packageIdInput) packageIdInput.value = packageId;

  const durationInput = document.getElementById('duration_minutes');
  if (durationInput) durationInput.value = durationMinutes;

  updateLiveCanvas({
    dataset: {
      title,
      duration,
      vision,
    },
  });
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
      } else {
        empty.classList.remove('hidden');
        filled.classList.add('hidden');
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
  const packageMeta = SESSION_PACKAGES[packageName] || {};
  const packageSelect = form.querySelector('[name="selected_package"]');
  const selectedOption = packageSelect?.selectedOptions?.[0];
  const duration = selectedOption?.dataset.duration || packageMeta.duration || '';
  const vision = selectedOption?.dataset.vision || packageMeta.vision || getValue('topic');

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

  const blueprintForm = document.getElementById('booking-form-blueprint');
  if (blueprintForm) {
    initCustomSelects(blueprintForm);
    initBookingForm(blueprintForm);

    const packageSelect = blueprintForm.querySelector('[name="selected_package"]');
    packageSelect?.addEventListener('change', () => {
      applySelectedPackage(packageSelect);
      scheduleCalendarRefresh();
    });

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
    form.querySelectorAll('select.js-custom-select').forEach((select) => {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  document.querySelectorAll('[name="selected_package"]').forEach(input => {
    input.value = '';
  });

  document.querySelectorAll('[name="selected_package_id"]').forEach(input => {
    input.value = '';
  });

  const durationInput = document.getElementById('duration_minutes');
  if (durationInput) durationInput.value = '120';

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