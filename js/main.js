/* ============================================
   AUTO-SERVICE — BOOKING WIZARD JS
   3 steps: service → date/time → form → success
   Cal.com integration
   ============================================ */

'use strict';

// ─── CONFIG ──────────────────────────────────────────────
const CONFIG = {
  // Replace with your Cal.com username and event slug
  calUsername: 'YOUR_CAL_USERNAME',
  calEventSlug: 'auto-service',

  // Working hours
  workStart: 9,
  workEnd: 18,
  workDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0=Sun)

  // Time slot interval in minutes
  slotInterval: 60,
};

// ─── STATE ───────────────────────────────────────────────
const state = {
  step: 1,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  calendarMonth: new Date(),
  form: { name: '', phone: '', email: '', comment: '' },
};

// ─── SERVICES DATA (injected from HTML via window.SERVICES) ──
// Defined in each HTML file as window.SERVICES = [...]

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderServices();
  setupStepButtons();
  setupForm();
  goToStep(1);
});

// ─── STEP NAVIGATION ─────────────────────────────────────
function goToStep(n) {
  state.step = n;

  // Update step indicators
  document.querySelectorAll('.step').forEach((el, i) => {
    const num = i + 1;
    el.classList.remove('active', 'done');
    if (num === n) el.classList.add('active');
    else if (num < n) el.classList.add('done');
  });

  // Update check icons in done steps
  document.querySelectorAll('.step.done .step-num').forEach(el => {
    el.textContent = '✓';
  });

  // Show/hide panels
  document.querySelectorAll('.wizard-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const panel = document.getElementById(`step-${n}`);
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('fade-in');
    setTimeout(() => panel.classList.remove('fade-in'), 300);
  }

  // Step-specific init
  if (n === 2) initCalendar();
  if (n === 3) renderSummary();
}

function setupStepButtons() {
  // Next buttons
  document.getElementById('btn-next-1')?.addEventListener('click', () => {
    if (!state.selectedService) {
      showToast(window.STRINGS?.selectService || 'Оберіть послугу');
      return;
    }
    goToStep(2);
  });

  document.getElementById('btn-next-2')?.addEventListener('click', () => {
    if (!state.selectedDate || !state.selectedTime) {
      showToast(window.STRINGS?.selectDateTime || 'Оберіть дату та час');
      return;
    }
    goToStep(3);
  });

  // Back buttons
  document.getElementById('btn-back-2')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-back-3')?.addEventListener('click', () => goToStep(2));

  // Submit
  document.getElementById('btn-submit')?.addEventListener('click', handleSubmit);

  // Restart
  document.getElementById('btn-restart')?.addEventListener('click', () => {
    state.selectedService = null;
    state.selectedDate = null;
    state.selectedTime = null;
    state.form = { name: '', phone: '', email: '', comment: '' };
    document.getElementById('step-success')?.classList.add('hidden');
    renderServices();
    goToStep(1);
  });
}

// ─── STEP 1: SERVICES ────────────────────────────────────
function renderServices() {
  const grid = document.getElementById('services-grid');
  if (!grid || !window.SERVICES) return;

  grid.innerHTML = window.SERVICES.map((s, i) => `
    <div class="service-card ${state.selectedService?.id === s.id ? 'selected' : ''}"
         onclick="selectService('${s.id}')"
         data-id="${s.id}">
      <div class="check">
        <svg viewBox="0 0 12 12"><polyline points="1,6 4,10 11,2"/></svg>
      </div>
      <div class="service-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="service-name">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      <div class="service-footer">
        <span class="service-duration">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/></svg>
          ${s.duration}
        </span>
        <span class="service-price">${s.price}</span>
      </div>
    </div>
  `).join('');
}

function selectService(id) {
  state.selectedService = window.SERVICES.find(s => s.id === id);
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === id);
  });
}

// ─── STEP 2: CALENDAR ────────────────────────────────────
function initCalendar() {
  if (!state.calendarMonth) {
    state.calendarMonth = new Date();
  }
  renderCalendar();
  renderTimeSlots();
}

function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const now = new Date();
  const month = state.calendarMonth;
  const year = month.getFullYear();
  const mon = month.getMonth();

  const monthNames = window.STRINGS?.months || [
    'Січень','Лютий','Березень','Квітень','Травень','Червень',
    'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'
  ];

  const dayNames = window.STRINGS?.days || ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

  // First day of month (adjusted to Mon=0)
  const firstDay = new Date(year, mon, 1);
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  let cells = '';
  // Day names header
  dayNames.forEach(d => {
    cells += `<div class="cal-day-name">${d}</div>`;
  });

  // Empty cells before first
  for (let i = 0; i < startDow; i++) {
    cells += `<div class="cal-day empty"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mon, d);
    const dow = date.getDay();
    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isWorkday = CONFIG.workDays.includes(dow);
    const isDisabled = isPast || !isWorkday;
    const isToday = d === now.getDate() && mon === now.getMonth() && year === now.getFullYear();
    const dateStr = formatDateStr(date);
    const isSelected = state.selectedDate === dateStr;

    const classes = [
      'cal-day',
      isDisabled ? 'disabled' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
    ].filter(Boolean).join(' ');

    const clickHandler = isDisabled ? '' : `onclick="selectDate('${dateStr}')"`;
    cells += `<div class="${classes}" ${clickHandler}>${d}</div>`;
  }

  container.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" onclick="changeMonth(-1)">‹</button>
      <span class="cal-month">${monthNames[mon]} ${year}</span>
      <button class="cal-nav" onclick="changeMonth(1)">›</button>
    </div>
    <div class="cal-grid">${cells}</div>
  `;
}

function changeMonth(dir) {
  const m = state.calendarMonth;
  state.calendarMonth = new Date(m.getFullYear(), m.getMonth() + dir, 1);
  renderCalendar();
}

function selectDate(dateStr) {
  state.selectedDate = dateStr;
  state.selectedTime = null;
  renderCalendar();
  renderTimeSlots();
}

function renderTimeSlots() {
  const container = document.getElementById('time-slots');
  if (!container) return;

  if (!state.selectedDate) {
    container.innerHTML = `<div class="time-placeholder">${window.STRINGS?.selectDateFirst || 'Спочатку оберіть дату'}</div>`;
    return;
  }

  // Generate slots
  const slots = [];
  for (let h = CONFIG.workStart; h < CONFIG.workEnd; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (CONFIG.slotInterval <= 30) {
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
  }

  container.innerHTML = `
    <div class="time-grid">
      ${slots.map(t => `
        <div class="time-slot ${state.selectedTime === t ? 'selected' : ''}"
             onclick="selectTime('${t}')">${t}</div>
      `).join('')}
    </div>
  `;
}

function selectTime(time) {
  state.selectedTime = time;
  renderTimeSlots();
}

// ─── STEP 3: FORM & SUMMARY ──────────────────────────────
function renderSummary() {
  const el = document.getElementById('booking-summary');
  if (!el || !state.selectedService) return;

  const s = window.STRINGS || {};
  const dateFormatted = state.selectedDate
    ? new Date(state.selectedDate + 'T12:00:00').toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : '—';

  el.innerHTML = `
    <div class="summary-title">${s.yourBooking || 'Ваше замовлення'}</div>
    <div class="summary-row">
      <span>${s.service || 'Послуга'}</span>
      <strong>${state.selectedService.name}</strong>
    </div>
    <div class="summary-row">
      <span>${s.dateLabel || 'Дата'}</span>
      <strong>${dateFormatted}</strong>
    </div>
    <div class="summary-row">
      <span>${s.timeLabel || 'Час'}</span>
      <strong>${state.selectedTime || '—'}</strong>
    </div>
    <div class="summary-row">
      <span>${s.duration || 'Тривалість'}</span>
      <strong>${state.selectedService.duration}</strong>
    </div>
    <div class="summary-row">
      <span>${s.price || 'Вартість'}</span>
      <strong class="val-accent">${state.selectedService.price}</strong>
    </div>
  `;
}

function setupForm() {
  ['name', 'phone', 'email', 'comment'].forEach(field => {
    const el = document.getElementById(`field-${field}`);
    if (el) {
      el.addEventListener('input', e => {
        state.form[field] = e.target.value;
        clearError(field);
      });
    }
  });
}

function validateForm() {
  let valid = true;
  const s = window.STRINGS || {};

  const name = document.getElementById('field-name');
  if (!state.form.name.trim()) {
    showError('name', s.errorRequired || 'Обов\'язкове поле');
    valid = false;
  }

  const phone = document.getElementById('field-phone');
  const phoneClean = state.form.phone.replace(/\D/g, '');
  if (phoneClean.length < 10) {
    showError('phone', s.errorPhone || 'Введіть коректний номер');
    valid = false;
  }

  const email = document.getElementById('field-email');
  if (state.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.form.email)) {
    showError('email', s.errorEmail || 'Некоректний email');
    valid = false;
  }

  return valid;
}

function showError(field, msg) {
  const input = document.getElementById(`field-${field}`);
  const err = document.getElementById(`error-${field}`);
  if (input) input.classList.add('error');
  if (err) err.textContent = msg;
}

function clearError(field) {
  const input = document.getElementById(`field-${field}`);
  const err = document.getElementById(`error-${field}`);
  if (input) input.classList.remove('error');
  if (err) err.textContent = '';
}

// ─── SUBMIT ──────────────────────────────────────────────
async function handleSubmit() {
  if (!validateForm()) return;

  const btn = document.getElementById('btn-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = (window.STRINGS?.sending || 'Надсилання') + '...';
  }

  try {
    // Build Cal.com booking URL with prefilled params
    const calUrl = buildCalUrl();

    // Alternatively — call Netlify Function to create booking via Cal.com API v2
    // Uncomment if you have a Netlify Function set up:
    // await submitViaNetlifyFunction();

    // Show success
    showSuccess(calUrl);

  } catch (err) {
    console.error(err);
    showToast(window.STRINGS?.errorGeneral || 'Помилка. Спробуйте ще раз.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = window.STRINGS?.submit || 'Підтвердити запис';
    }
  }
}

function buildCalUrl() {
  const dateObj = new Date(state.selectedDate + 'T' + state.selectedTime + ':00');

  const params = new URLSearchParams({
    name: state.form.name,
    email: state.form.email || '',
    phone: state.form.phone,
    notes: `${state.selectedService?.name || ''}\n${state.form.comment || ''}`,
    date: state.selectedDate,
  });

  return `https://cal.com/${CONFIG.calUsername}/${CONFIG.calEventSlug}?${params}`;
}

async function submitViaNetlifyFunction() {
  const res = await fetch('/.netlify/functions/create-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: state.selectedService?.id,
      serviceName: state.selectedService?.name,
      date: state.selectedDate,
      time: state.selectedTime,
      name: state.form.name,
      phone: state.form.phone,
      email: state.form.email,
      comment: state.form.comment,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Server error');
  }

  return await res.json();
}

function showSuccess(calUrl) {
  // Hide wizard panels
  document.querySelectorAll('.wizard-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.remove('active');
    el.classList.add('done');
    el.querySelector('.step-num').textContent = '✓';
  });

  const screen = document.getElementById('step-success');
  if (!screen) return;

  const s = window.STRINGS || {};
  const dateFormatted = state.selectedDate
    ? new Date(state.selectedDate + 'T12:00:00').toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long'
      })
    : '';

  screen.querySelector('.success-detail').innerHTML = `
    <div class="summary-row">
      <span>${s.service || 'Послуга'}</span>
      <strong>${state.selectedService?.name || ''}</strong>
    </div>
    <div class="summary-row">
      <span>${s.dateLabel || 'Дата та час'}</span>
      <strong>${dateFormatted}, ${state.selectedTime}</strong>
    </div>
    <div class="summary-row">
      <span>${s.nameLabel || 'Ім\'я'}</span>
      <strong>${state.form.name}</strong>
    </div>
    ${state.form.email ? `
    <div class="summary-row">
      <span>Email</span>
      <strong>${state.form.email}</strong>
    </div>` : ''}
  `;

  // Cal.com link
  const calLink = screen.querySelector('.cal-link');
  if (calLink && calUrl) {
    calLink.href = calUrl;
    calLink.classList.remove('hidden');
  }

  screen.classList.remove('hidden');
  screen.classList.add('fade-in');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── UTILS ───────────────────────────────────────────────
function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
      background: #333; color: #fff; padding: 12px 24px; border-radius: 4px;
      font-size: 13px; z-index: 9999; opacity: 0; transition: opacity 0.2s;
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
