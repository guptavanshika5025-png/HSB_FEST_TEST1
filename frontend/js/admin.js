/**
 * Zenith '26 Fest Management System — Cosmic Universe Admin Operations JavaScript
 * Fetches live computed statistics, renders sortable capacity utilization tables,
 * manages registration rosters, handles event creation, and registration cancellation.
 */

// State
let allEvents = [];
let allRegistrations = [];
let activeTab = 'events';
let registrationToDeleteId = null;

// Cosmic Category Badge Configuration
const CATEGORY_STYLES = {
  Technical: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]',
  Cultural: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(124,58,237,0.2)]',
  Sports: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
  Gaming: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_8px_rgba(217,70,239,0.2)]',
  Workshop: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
};

// DOM References
const statTotalEvents = document.getElementById('stat-total-events');
const statTotalRegistrations = document.getElementById('stat-total-registrations');
const statUtilizationPct = document.getElementById('stat-utilization-pct');
const statUtilizationBar = document.getElementById('stat-utilization-bar');
const statUpcomingEvents = document.getElementById('stat-upcoming-events');
const categoriesBreakdownContainer = document.getElementById('categories-breakdown-container');

// Tabs
const tabBtnEvents = document.getElementById('tab-btn-events');
const tabBtnRegistrations = document.getElementById('tab-btn-registrations');
const tabContentEvents = document.getElementById('tab-content-events');
const tabContentRegistrations = document.getElementById('tab-content-registrations');
const tabEventsBadge = document.getElementById('tab-events-badge');
const tabRegBadge = document.getElementById('tab-reg-badge');

// Tables
const eventsTableBody = document.getElementById('events-table-body');
const registrationsTableBody = document.getElementById('registrations-table-body');
const eventFilterSelect = document.getElementById('event-filter-select');
const registrationsFilterCount = document.getElementById('registrations-filter-count');
const capacityWarningBanner = document.getElementById('capacity-warning-banner');

// Refresh Button
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');

// Add Event Modal
const openAddEventBtn = document.getElementById('open-add-event-btn');
const closeAddEventBtn = document.getElementById('close-add-event-btn');
const cancelAddEventBtn = document.getElementById('cancel-add-event-btn');
const addEventModal = document.getElementById('add-event-modal');
const addEventForm = document.getElementById('add-event-form');
const addEventError = document.getElementById('add-event-error');

// Delete Registration Modal
const deleteRegModal = document.getElementById('delete-reg-modal');
const deleteRegDetails = document.getElementById('delete-reg-details');
const cancelDeleteRegBtn = document.getElementById('cancel-delete-reg-btn');
const confirmDeleteRegBtn = document.getElementById('confirm-delete-reg-btn');

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAllAdminData();
});

function setupEventListeners() {
  refreshBtn.addEventListener('click', () => {
    refreshIcon.classList.add('animate-spin');
    loadAllAdminData().finally(() => {
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 600);
    });
  });

  // Tab switching
  tabBtnEvents.addEventListener('click', () => switchTab('events'));
  tabBtnRegistrations.addEventListener('click', () => switchTab('registrations'));

  // Registration event filter
  eventFilterSelect.addEventListener('change', (e) => {
    filterRegistrations(e.target.value);
  });

  // Add Event Modal Listeners
  if (openAddEventBtn) {
    openAddEventBtn.addEventListener('click', () => {
      addEventForm.reset();
      addEventError.classList.add('hidden');
      addEventModal.classList.remove('hidden');
    });
  }

  const hideAddModal = () => addEventModal.classList.add('hidden');
  if (closeAddEventBtn) closeAddEventBtn.addEventListener('click', hideAddModal);
  if (cancelAddEventBtn) cancelAddEventBtn.addEventListener('click', hideAddModal);

  if (addEventForm) {
    addEventForm.addEventListener('submit', handleAddEventSubmit);
  }

  // Delete Registration Modal Listeners
  if (cancelDeleteRegBtn) {
    cancelDeleteRegBtn.addEventListener('click', () => {
      deleteRegModal.classList.add('hidden');
      registrationToDeleteId = null;
    });
  }

  if (confirmDeleteRegBtn) {
    confirmDeleteRegBtn.addEventListener('click', executeRegistrationDelete);
  }
}

function switchTab(tab) {
  activeTab = tab;
  if (tab === 'events') {
    tabBtnEvents.className = 'tab-btn pb-3 text-xs sm:text-sm font-orbitron font-semibold text-cyan-300 border-b-2 border-cyan-400 transition-colors flex items-center gap-2 cursor-pointer tracking-wider';
    tabBtnRegistrations.className = 'tab-btn pb-3 text-xs sm:text-sm font-orbitron font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors flex items-center gap-2 cursor-pointer tracking-wider';
    tabContentEvents.classList.remove('hidden');
    tabContentRegistrations.classList.add('hidden');
  } else {
    tabBtnEvents.className = 'tab-btn pb-3 text-xs sm:text-sm font-orbitron font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors flex items-center gap-2 cursor-pointer tracking-wider';
    tabBtnRegistrations.className = 'tab-btn pb-3 text-xs sm:text-sm font-orbitron font-semibold text-cyan-300 border-b-2 border-cyan-400 transition-colors flex items-center gap-2 cursor-pointer tracking-wider';
    tabContentEvents.classList.add('hidden');
    tabContentRegistrations.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// Data Loading Orchestrator
// -------------------------------------------------------------
async function loadAllAdminData() {
  await Promise.all([
    fetchStats(),
    fetchEventsData(),
    fetchRegistrationsData(),
  ]);
}

// -------------------------------------------------------------
// 1. Fetch & Render Stats
// -------------------------------------------------------------
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = await res.json();

    // Four Stat Cards
    statTotalEvents.textContent = stats.total_events;
    statTotalRegistrations.textContent = stats.total_registrations;
    statUtilizationPct.textContent = `${stats.overall_utilization_pct}%`;
    statUtilizationBar.style.width = `${Math.min(100, stats.overall_utilization_pct)}%`;
    statUpcomingEvents.textContent = stats.upcoming_events_count;

    // Render Sector Breakdown
    renderCategoryBreakdown(stats.events_by_category, stats.total_events);
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    statTotalEvents.textContent = 'Err';
    statTotalRegistrations.textContent = 'Err';
    statUtilizationPct.textContent = 'Err';
  }
}

function renderCategoryBreakdown(categoryCounts, totalEvents) {
  categoriesBreakdownContainer.innerHTML = '';
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    categoriesBreakdownContainer.innerHTML = '<div class="text-xs font-mono text-slate-400">No sectors recorded in database.</div>';
    return;
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
    const style = CATEGORY_STYLES[category] || 'bg-slate-700 text-slate-300 border-slate-600';

    const card = document.createElement('div');
    card.className = 'bg-[#080B2A]/80 p-3.5 rounded-2xl border border-cyan-500/20 flex flex-col justify-between shadow-inner';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${style} uppercase tracking-wider">${escapeHtml(category)}</span>
        <span class="font-orbitron text-xs font-bold text-white">${count}</span>
      </div>
      <div class="w-full bg-[#0B102F] rounded-full h-1.5 overflow-hidden mt-1.5 border border-slate-800">
        <div class="bg-gradient-to-r from-violet-500 to-cyan-400 h-1.5 rounded-full shadow-[0_0_6px_#00E5FF]" style="width: ${pct}%"></div>
      </div>
      <span class="font-mono text-[10px] text-cosmic-lavender mt-1.5 block">${pct}% of catalog</span>
    `;
    categoriesBreakdownContainer.appendChild(card);
  }
}

// -------------------------------------------------------------
// 2. Fetch & Render Events Utilization Table
// -------------------------------------------------------------
async function fetchEventsData() {
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();
    allEvents = events;
    tabEventsBadge.textContent = events.length;

    // Populate dropdown in registration filter
    populateEventFilterDropdown(events);

    // Compute utilization % and sort descending by utilization %
    const eventsWithUtilization = events.map(ev => {
      const registered = ev.capacity - ev.available_seats;
      const utilization = ev.capacity > 0 ? (registered / ev.capacity) * 100 : 0;
      return {
        ...ev,
        registered,
        utilizationPct: Math.round(utilization * 10) / 10,
      };
    });

    eventsWithUtilization.sort((a, b) => b.utilizationPct - a.utilizationPct);

    renderEventsTable(eventsWithUtilization);
  } catch (err) {
    console.error('Failed to load events table:', err);
    eventsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-rose-400 font-mono">
          COMMUNICATION INTERRUPTED: FAILED TO FETCH MISSION DATA
        </td>
      </tr>
    `;
  }
}

function renderEventsTable(events) {
  eventsTableBody.innerHTML = '';

  if (events.length === 0) {
    eventsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 font-mono">
          NO MISSION MODULES FOUND IN ORBITAL DATABASE.
        </td>
      </tr>
    `;
    capacityWarningBanner.classList.add('hidden');
    return;
  }

  let highCapacityCount = 0;

  events.forEach(ev => {
    const isCritical = ev.utilizationPct >= 90;
    if (isCritical) highCapacityCount++;

    const catStyle = CATEGORY_STYLES[ev.category] || 'bg-slate-700 text-slate-300 border-slate-600';

    const tr = document.createElement('tr');
    tr.className = `transition-colors hover:bg-[#080B2A]/60 ${
      isCritical ? 'bg-amber-500/10 border-l-4 border-l-amber-400 font-medium' : ''
    }`;

    tr.innerHTML = `
      <!-- Title + Icon -->
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl shrink-0 p-1 bg-[#080B2A] rounded-xl border border-cyan-500/20">${ev.icon || '⚡'}</span>
          <div>
            <span class="font-orbitron font-bold text-white block text-sm ${isCritical ? 'text-amber-200' : ''}">${escapeHtml(ev.title)}</span>
            <span class="font-mono text-[10px] text-cosmic-lavender">ID: #${ev.id} • Access: ${ev.fee > 0 ? '₹' + ev.fee : 'Free'}</span>
          </div>
        </div>
      </td>

      <!-- Sector -->
      <td class="py-3.5 px-4 whitespace-nowrap">
        <span class="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md border ${catStyle} uppercase tracking-wider">
          ${escapeHtml(ev.category)}
        </span>
      </td>

      <!-- Launch Window -->
      <td class="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-xs">
        <div>${formatDate(ev.event_date)}</div>
        <div class="text-[10px] text-cyan-400">${ev.event_time}</div>
      </td>

      <!-- Orbital Dock -->
      <td class="py-3.5 px-4 text-slate-300 font-space text-xs max-w-xs truncate">
        ${escapeHtml(ev.venue)}
      </td>

      <!-- Allocated / Capacity -->
      <td class="py-3.5 px-4 whitespace-nowrap">
        <div class="font-orbitron text-xs font-bold ${isCritical ? 'text-amber-300' : 'text-slate-200'}">
          ${ev.registered} / ${ev.capacity}
        </div>
        <div class="font-mono text-[10px] text-cyan-400/80">
          ${ev.available_seats} slots available
        </div>
      </td>

      <!-- Utilization % -->
      <td class="py-3.5 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-2.5">
          <div class="w-16 bg-[#080B2A] rounded-full h-1.5 hidden sm:block border border-slate-800">
            <div class="h-1.5 rounded-full ${
              isCritical ? 'bg-rose-500 shadow-[0_0_6px_#F43F5E]' : 'bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_6px_#00E5FF]'
            }" style="width: ${Math.min(100, ev.utilizationPct)}%"></div>
          </div>
          <span class="font-mono font-bold px-2 py-0.5 rounded text-xs ${
            isCritical 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_6px_rgba(244,63,94,0.3)]' 
              : 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
          }">
            ${ev.utilizationPct}%
          </span>
        </div>
      </td>
    `;
    eventsTableBody.appendChild(tr);
  });

  // Warning Banner for >90% capacity
  if (highCapacityCount > 0) {
    capacityWarningBanner.classList.remove('hidden');
    document.getElementById('capacity-warning-text').textContent = 
      `Attention: ${highCapacityCount} mission module(s) have reached or exceeded 90% capacity load. Check highlighted rows above.`;
  } else {
    capacityWarningBanner.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// 3. Fetch & Render Cadet Registrations Table
// -------------------------------------------------------------
async function fetchRegistrationsData() {
  try {
    const res = await fetch('/api/registrations');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const regs = await res.json();
    allRegistrations = regs;
    tabRegBadge.textContent = regs.length;

    filterRegistrations(eventFilterSelect.value);
  } catch (err) {
    console.error('Failed to load registrations:', err);
    registrationsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-6 text-center text-rose-400 font-mono">
          TELEMETRY OFFLINE: FAILED TO RETRIEVE CADET ROSTER
        </td>
      </tr>
    `;
  }
}

function filterRegistrations(selectedEventId) {
  let filtered = allRegistrations;
  if (selectedEventId) {
    filtered = allRegistrations.filter(r => String(r.event_id) === String(selectedEventId));
  }

  registrationsFilterCount.textContent = `Displaying ${filtered.length} of ${allRegistrations.length} enrolled cadets`;
  renderRegistrationsTable(filtered);
}

function renderRegistrationsTable(regs) {
  registrationsTableBody.innerHTML = '';

  if (regs.length === 0) {
    registrationsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-10 text-center font-mono text-slate-400">
          NO CADET ENROLLMENTS RECORDED FOR THIS CRITERIA.
        </td>
      </tr>
    `;
    return;
  }

  regs.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors hover:bg-[#080B2A]/60';

    tr.innerHTML = `
      <td class="py-3 px-4 font-space font-bold text-white whitespace-nowrap">
        ${escapeHtml(r.student_name)}
      </td>
      <td class="py-3 px-4 text-cyan-300 font-mono text-xs whitespace-nowrap">
        ${escapeHtml(r.roll_number)}
      </td>
      <td class="py-3 px-4 text-cosmic-lavender text-xs font-mono">
        ${escapeHtml(r.email)}
      </td>
      <td class="py-3 px-4 text-slate-400 text-xs whitespace-nowrap font-mono">
        ${escapeHtml(r.phone || '—')}
      </td>
      <td class="py-3 px-4 text-slate-200 font-medium">
        <span class="inline-block px-2.5 py-1 rounded-lg text-[11px] font-space bg-[#080B2A] border border-cyan-500/30 text-cyan-200">
          ${escapeHtml(r.event_title)}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-400 text-xs whitespace-nowrap font-mono">
        ${formatDateTime(r.registered_at)}
      </td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <button 
          type="button" 
          onclick="promptDeleteRegistration(${r.id}, '${escapeHtml(r.student_name)}', '${escapeHtml(r.event_title)}')" 
          class="px-3 py-1 rounded-lg font-mono text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-sm"
          title="Revoke this cadet's enrollment"
        >
          Revoke Seat
        </button>
      </td>
    `;
    registrationsTableBody.appendChild(tr);
  });
}

function populateEventFilterDropdown(events) {
  const currentVal = eventFilterSelect.value;
  eventFilterSelect.innerHTML = '<option value="">All Missions (Show All Cadets)</option>';
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${ev.icon || ''} ${ev.title} (#${ev.id})`;
    eventFilterSelect.appendChild(opt);
  });
  eventFilterSelect.value = currentVal;
}

// -------------------------------------------------------------
// Stretch Goal 1: Authorize Mission Form Submission (POST /api/events)
// -------------------------------------------------------------
async function handleAddEventSubmit(e) {
  e.preventDefault();
  addEventError.classList.add('hidden');

  const title = document.getElementById('new-event-title').value.trim();
  const category = document.getElementById('new-event-category').value;
  const icon = document.getElementById('new-event-icon').value.trim() || '🪐';
  const event_date = document.getElementById('new-event-date').value;
  const event_time = document.getElementById('new-event-time').value.trim();
  const venue = document.getElementById('new-event-venue').value.trim();
  const capacity = parseInt(document.getElementById('new-event-capacity').value, 10);
  const fee = parseInt(document.getElementById('new-event-fee').value, 10) || 0;
  const description = document.getElementById('new-event-description').value.trim();

  // Basic validation
  if (!title || !category || !event_date || !event_time || !venue || isNaN(capacity) || capacity <= 0) {
    addEventError.textContent = 'PROTOCOL WARNING: All required mission parameters must be filled with valid numbers (capacity > 0).';
    addEventError.classList.remove('hidden');
    return;
  }

  try {
    const payload = {
      title,
      category,
      icon,
      event_date,
      event_time,
      venue,
      capacity,
      fee,
      description,
    };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
    }

    // Success: hide modal, reload stats and events
    addEventModal.classList.add('hidden');
    await loadAllAdminData();
  } catch (err) {
    console.error('Error creating event:', err);
    addEventError.textContent = err.message || 'Failed to authorize mission.';
    addEventError.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// Stretch Goal 2: Cancel Registration (DELETE /api/registrations/{id})
// -------------------------------------------------------------
window.promptDeleteRegistration = function(regId, studentName, eventTitle) {
  registrationToDeleteId = regId;
  deleteRegDetails.textContent = `Are you sure you want to revoke the enrollment for "${studentName}" for the mission "${eventTitle}"? This will release the orbital slot immediately.`;
  deleteRegModal.classList.remove('hidden');
};

async function executeRegistrationDelete() {
  if (!registrationToDeleteId) return;

  try {
    const res = await fetch(`/api/registrations/${registrationToDeleteId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error: HTTP ${res.status}`);
    }

    // Hide confirmation modal
    deleteRegModal.classList.add('hidden');
    registrationToDeleteId = null;

    // Refresh all data immediately
    await loadAllAdminData();
  } catch (err) {
    console.error('Failed to cancel registration:', err);
    alert(`Could not cancel registration: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '—';
  return dateTimeStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
