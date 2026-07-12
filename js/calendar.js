// =====================================================
// SESSION CALENDAR — Google Calendar availability
// =====================================================

const calendarState = {
  events: [],
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  selectedDate: null,
  selectedTime: null,
  durationMinutes: 120,
  loading: false,
  syncError: null,
};

const calendarModal = document.getElementById('session-calendar-modal');
const calendarDays = document.getElementById('calendar-days');
const calendarMonthLabel = document.getElementById('calendar-month-label');
const calendarSlots = document.getElementById('calendar-slots');
const calendarSlotsEmpty = document.getElementById('calendar-slots-empty');
const calendarBusyList = document.getElementById('calendar-busy-list');
const calendarConfirmBtn = document.getElementById('calendar-confirm-btn');
const preferredDateInput = document.getElementById('preferred_date');
const preferredTimeInput = document.getElementById('preferred_time');
const preferredDateLabel = document.getElementById('preferred-date-label');
const preferredDateTrigger = document.getElementById('preferred-date-trigger');
const durationMinutesInput = document.getElementById('duration_minutes');

const WORKDAY_START = 9;
const WORKDAY_END = 18;
const SLOT_STEP_MINUTES = 30;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(key) {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDisplayTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

function eventToRange(event) {
  return {
    start: new Date(event.start),
    end: new Date(event.end),
    title: event.title,
  };
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function getEventsForDate(dateKey) {
  const dayStart = parseDateKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  return calendarState.events
    .map(eventToRange)
    .filter((event) => rangesOverlap(dayStart, dayEnd, event.start, event.end));
}

function hasAvailabilityOnDate(dateKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parseDateKey(dateKey) < today) return false;
  return buildSlotsForDate(dateKey).length > 0;
}

function buildSlotsForDate(dateKey) {
  const duration = calendarState.durationMinutes;
  const dayEvents = getEventsForDate(dateKey);
  const slots = [];

  for (let hour = WORKDAY_START; hour < WORKDAY_END; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_STEP_MINUTES) {
      const start = parseDateKey(dateKey);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);

      if (end.getHours() > WORKDAY_END || (end.getHours() === WORKDAY_END && end.getMinutes() > 0)) {
        continue;
      }

      const now = new Date();
      if (start <= now) continue;

      const blocked = dayEvents.some((event) => rangesOverlap(start, end, event.start, event.end));
      if (!blocked) {
        slots.push({
          time: `${pad(hour)}:${pad(minute)}`,
          label: formatDisplayTime(`${pad(hour)}:${pad(minute)}`),
        });
      }
    }
  }

  return slots;
}

async function fetchCalendarEvents(year, month, { force = false } = {}) {
  const { start, end } = getMonthRange(year, month);
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  });

  if (force) {
    params.set('_', String(Date.now()));
  }

  try {
    if (typeof window.isPortfolioFileProtocol === 'function' && window.isPortfolioFileProtocol()) {
      throw new Error(window.getPortfolioServerMessage());
    }

    const response = await fetch(`api/events.php?${params.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || data.google_error || 'Unable to load calendar availability.');
    }
    calendarState.events = data.events || [];
    calendarState.syncError = data.google_error || null;
    calendarState.lastFetchedAt = data.fetched_at || new Date().toISOString();
    return true;
  } catch (error) {
    calendarState.events = [];
    calendarState.syncError = error.message || 'Calendar sync unavailable. You can still pick a slot.';
    return false;
  }
}

async function refreshAtelierCalendar({ force = true } = {}) {
  calendarState.loading = true;
  updateCalendarStatus();

  await fetchCalendarEvents(calendarState.year, calendarState.month, { force });

  calendarState.loading = false;

  if (calendarModal && !calendarModal.classList.contains('hidden')) {
    renderCalendarDays();
    renderCalendarSlots();
  }

  updateCalendarStatus();
  return calendarState.events;
}

window.refreshAtelierCalendar = refreshAtelierCalendar;

function updateCalendarStatus() {
  const statusEl = document.getElementById('calendar-sync-status');
  if (!statusEl) return;

  if (calendarState.loading) {
    statusEl.textContent = 'Loading booked sessions...';
    statusEl.classList.remove('hidden');
    return;
  }

  if (calendarState.syncError) {
    statusEl.textContent = calendarState.syncError;
    statusEl.classList.remove('hidden');
    return;
  }

  const count = calendarState.events.length;

  if (calendarState.syncError && count === 0) {
    statusEl.textContent = `Google Calendar: ${calendarState.syncError}`;
  } else if (count === 0) {
    statusEl.textContent = 'Live from Google Calendar — no booked sessions this month.';
  } else {
    statusEl.textContent = `${count} booked session${count === 1 ? '' : 's'} loaded live from Google Calendar.`;
  }
  statusEl.classList.remove('hidden');
}

function renderCalendarDays() {
  if (!calendarDays || !calendarMonthLabel) return;

  const { year, month } = calendarState;
  calendarMonthLabel.textContent = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  calendarDays.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'calendar-day calendar-day--spacer';
    calendarDays.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const dayEvents = getEventsForDate(dateKey);
    const hasOpenSlots = hasAvailabilityOnDate(dateKey);
    const isPast = parseDateKey(dateKey) < new Date(new Date().setHours(0, 0, 0, 0));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.textContent = String(day);
    button.dataset.date = dateKey;

    if (isPast) button.classList.add('calendar-day--disabled');
    if (dayEvents.length) button.classList.add('calendar-day--busy');
    if (hasOpenSlots) button.classList.add('calendar-day--available');
    if (dateKey === todayKey) button.classList.add('calendar-day--today');
    if (dateKey === calendarState.selectedDate) button.classList.add('calendar-day--selected');

    if (!isPast) {
      button.addEventListener('click', () => selectCalendarDate(dateKey));
    }

    calendarDays.appendChild(button);
  }
}

function renderCalendarSlots() {
  if (!calendarSlots || !calendarSlotsEmpty || !calendarBusyList) return;

  calendarSlots.innerHTML = '';
  calendarBusyList.innerHTML = '';

  if (!calendarState.selectedDate) {
    calendarSlotsEmpty.classList.remove('hidden');
    calendarSlots.classList.add('hidden');
    calendarBusyList.classList.add('hidden');
    return;
  }

  calendarSlotsEmpty.classList.add('hidden');
  calendarSlots.classList.remove('hidden');

  const slots = buildSlotsForDate(calendarState.selectedDate);
  const busyEvents = getEventsForDate(calendarState.selectedDate);

  if (!slots.length) {
    calendarSlots.innerHTML = '<div class="text-sm text-muted">No open slots on this date. Try another day.</div>';
  } else {
    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-slot';
      button.textContent = slot.label;
      button.dataset.time = slot.time;
      if (slot.time === calendarState.selectedTime) {
        button.classList.add('calendar-slot--selected');
      }
      button.addEventListener('click', () => selectCalendarTime(slot.time));
      calendarSlots.appendChild(button);
    });
  }

  if (busyEvents.length) {
    calendarBusyList.classList.remove('hidden');
    calendarBusyList.innerHTML = `
      <div class="text-[10px] uppercase tracking-widest text-muted mb-2">Already booked</div>
      ${busyEvents.map((event) => `
        <div class="calendar-busy-item">
          <span>${event.title}</span>
          <span>${event.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${event.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      `).join('')}
    `;
  } else {
    calendarBusyList.classList.add('hidden');
  }

  updateCalendarConfirmState();
}

function selectCalendarDate(dateKey) {
  calendarState.selectedDate = dateKey;
  calendarState.selectedTime = null;
  renderCalendarDays();
  renderCalendarSlots();
}

function selectCalendarTime(time) {
  calendarState.selectedTime = time;
  renderCalendarSlots();
}

function updateCalendarConfirmState() {
  if (!calendarConfirmBtn) return;
  const ready = Boolean(calendarState.selectedDate && calendarState.selectedTime);
  calendarConfirmBtn.disabled = !ready;
}

function updatePreferredDateLabel() {
  if (!preferredDateLabel) return;

  const date = preferredDateInput?.value;
  const time = preferredTimeInput?.value;

  if (!date || !time) {
    preferredDateLabel.textContent = 'Select date & time';
    preferredDateLabel.classList.add('text-muted');
    return;
  }

  preferredDateLabel.textContent = `${formatDisplayDate(date)} · ${formatDisplayTime(time)}`;
  preferredDateLabel.classList.remove('text-muted');
}

function confirmCalendarSelection() {
  if (!calendarState.selectedDate || !calendarState.selectedTime) return;

  if (preferredDateInput) preferredDateInput.value = calendarState.selectedDate;
  if (preferredTimeInput) preferredTimeInput.value = calendarState.selectedTime;

  updatePreferredDateLabel();
  closeCalendarModal();

  if (typeof window.updateSessionTicket === 'function') {
    window.updateSessionTicket();
  }

  preferredDateInput?.dispatchEvent(new Event('change', { bubbles: true }));
}

async function openCalendarModal() {
  if (!calendarModal) return;

  const duration = Number(durationMinutesInput?.value || 120);
  calendarState.durationMinutes = duration > 0 ? duration : 120;
  calendarState.selectedDate = preferredDateInput?.value || null;
  calendarState.selectedTime = preferredTimeInput?.value || null;
  calendarState.syncError = null;

  calendarModal.classList.remove('hidden');
  calendarModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('calendar-open');

  renderCalendarDays();
  renderCalendarSlots();
  calendarState.loading = true;
  updateCalendarStatus();

  const synced = await fetchCalendarEvents(calendarState.year, calendarState.month, { force: true });
  calendarState.loading = false;
  renderCalendarDays();
  renderCalendarSlots();
  updateCalendarStatus();

  if (!synced && typeof showBookingToast === 'function') {
    showBookingToast('Could not reach Google Calendar. Slots may not reflect latest bookings.');
  }
}

function closeCalendarModal() {
  if (!calendarModal) return;
  calendarModal.classList.add('hidden');
  calendarModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('calendar-open');
}

async function changeCalendarMonth(delta) {
  calendarState.month += delta;
  if (calendarState.month < 0) {
    calendarState.month = 11;
    calendarState.year -= 1;
  } else if (calendarState.month > 11) {
    calendarState.month = 0;
    calendarState.year += 1;
  }

  renderCalendarDays();
  renderCalendarSlots();
  calendarState.loading = true;
  updateCalendarStatus();

  await fetchCalendarEvents(calendarState.year, calendarState.month, { force: true });

  calendarState.loading = false;
  renderCalendarDays();
  renderCalendarSlots();
  updateCalendarStatus();
}

function initSessionCalendar() {
  preferredDateTrigger?.addEventListener('click', openCalendarModal);
  calendarConfirmBtn?.addEventListener('click', confirmCalendarSelection);
  document.getElementById('calendar-prev-month')?.addEventListener('click', () => changeCalendarMonth(-1));
  document.getElementById('calendar-next-month')?.addEventListener('click', () => changeCalendarMonth(1));

  document.querySelectorAll('[data-close-calendar]').forEach((el) => {
    el.addEventListener('click', closeCalendarModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && calendarModal && !calendarModal.classList.contains('hidden')) {
      closeCalendarModal();
    }
  });

  updatePreferredDateLabel();
}

document.addEventListener('DOMContentLoaded', initSessionCalendar);
