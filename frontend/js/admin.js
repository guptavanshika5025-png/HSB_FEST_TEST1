/**
 * Zenith '26 Fest Management System — Admin Dashboard JavaScript
 * Fetches live computed statistics, renders sortable capacity utilization tables,
 * manages registration rosters, handles event creation, and registration cancellation.
 */

// State
let allEvents = [];
let allRegistrations = [];
let activeTab = 'events';
let registrationToDeleteId = null;

// Category Badge Configuration
const CATEGORY_STYLES = {
  Technical: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Cultural: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Sports: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Gaming: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  Workshop: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
    tabBtnEvents.className = 'tab-btn pb-3 text-sm font-semibold text-violet-400 border-b-2 border-violet-500 transition-colors flex items-center gap-2 cursor-pointer';
    tabBtnRegistrations.className = 'tab-btn pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors flex items-center gap-2 cursor-pointer';
    tabContentEvents.classList.remove('hidden');
    tabContentRegistrations.classList.add('hidden');
  } else {
    tabBtnEvents.className = 'tab-btn pb-3 text-sm font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors flex items-center gap-2 cursor-pointer';
    tabBtnRegistrations.className = 'tab-btn pb-3 text-sm font-semibold text-violet-400 border-b-2 border-violet-500 transition-colors flex items-center gap-2 cursor-pointer';
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
// 1. Fetch & Render Stats (Step 8 requirement 1 & 2)
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

    // Render Category Breakdown (Step 8 requirement 2)
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
    categoriesBreakdownContainer.innerHTML = '<div class="text-xs text-slate-400">No categories recorded.</div>';
    return;
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
    const style = CATEGORY_STYLES[category] || 'bg-slate-700 text-slate-300 border-slate-600';

    const card = document.createElement('div');
    card.className = 'bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col justify-between';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold px-2 py-0.5 rounded-md border ${style}">${escapeHtml(category)}</span>
        <span class="text-xs font-bold text-white">${count}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-1">
        <div class="bg-violet-500 h-1 rounded-full" style="width: ${pct}%"></div>
      </div>
      <span class="text-[10px] text-slate-400 mt-1 block">${pct}% of fest events</span>
    `;
    categoriesBreakdownContainer.appendChild(card);
  }
}

// -------------------------------------------------------------
// 2. Fetch & Render Events Utilization Table (Step 8 requirement 3 & 4)
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
        <td colspan="6" class="py-6 text-center text-rose-400">
          Failed to load events data from backend.
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
        <td colspan="6" class="py-6 text-center text-slate-400">
          No events found in database.
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
    tr.className = `transition-colors hover:bg-slate-800/50 ${
      isCritical ? 'bg-amber-500/10 border-l-4 border-l-amber-500 font-medium' : ''
    }`;

    tr.innerHTML = `
      <!-- Title + Icon -->
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-2.5">
          <span class="text-xl shrink-0">${ev.icon || '⚡'}</span>
          <div>
            <span class="font-bold text-white block ${isCritical ? 'text-amber-200' : ''}">${escapeHtml(ev.title)}</span>
            <span class="text-[11px] text-slate-400">ID: #${ev.id} • Fee: ${ev.fee > 0 ? '₹' + ev.fee : 'Free'}</span>
          </div>
        </div>
      </td>

      <!-- Category -->
      <td class="py-3.5 px-4 whitespace-nowrap">
        <span class="text-[11px] font-semibold px-2.5 py-1 rounded-md border ${catStyle}">
          ${escapeHtml(ev.category)}
        </span>
      </td>

      <!-- Date & Time -->
      <td class="py-3.5 px-4 whitespace-nowrap text-slate-300">
        <div>${formatDate(ev.event_date)}</div>
        <div class="text-[11px] text-slate-400">${ev.event_time}</div>
      </td>

      <!-- Venue -->
      <td class="py-3.5 px-4 text-slate-300 max-w-xs truncate">
        ${escapeHtml(ev.venue)}
      </td>

      <!-- Registered / Capacity -->
      <td class="py-3.5 px-4 whitespace-nowrap">
        <div class="font-bold ${isCritical ? 'text-amber-300' : 'text-slate-200'}">
          ${ev.registered} / ${ev.capacity}
        </div>
        <div class="text-[10px] text-slate-400">
          ${ev.available_seats} seats remaining
        </div>
      </td>

      <!-- Utilization % -->
      <td class="py-3.5 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-2">
          <div class="w-16 bg-slate-800 rounded-full h-1.5 hidden sm:block">
            <div class="h-1.5 rounded-full ${
              isCritical ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
            }" style="width: ${Math.min(100, ev.utilizationPct)}%"></div>
          </div>
          <span class="font-bold px-2 py-0.5 rounded text-xs ${
            isCritical 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
              : 'text-slate-200'
          }">
            ${ev.utilizationPct}%
          </span>
        </div>
      </td>
    `;
    eventsTableBody.appendChild(tr);
  });

  // Step 8 requirement 4: Highlight any event over 90% capacity in a warning banner
  if (highCapacityCount > 0) {
    capacityWarningBanner.classList.remove('hidden');
    document.getElementById('capacity-warning-text').textContent = 
      `Attention: ${highCapacityCount} event(s) have reached or exceeded 90% capacity. Check highlighted rows above.`;
  } else {
    capacityWarningBanner.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// 3. Fetch & Render Registrations Table (Step 8 requirement 5)
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
        <td colspan="7" class="py-6 text-center text-rose-400">
          Failed to load student registrations.
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

  registrationsFilterCount.textContent = `Showing ${filtered.length} of ${allRegistrations.length} registrations`;
  renderRegistrationsTable(filtered);
}

function renderRegistrationsTable(regs) {
  registrationsTableBody.innerHTML = '';

  if (regs.length === 0) {
    registrationsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400">
          No registrations found for the selected criteria.
        </td>
      </tr>
    `;
    return;
  }

  regs.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors hover:bg-slate-800/40';

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-white whitespace-nowrap">
        ${escapeHtml(r.student_name)}
      </td>
      <td class="py-3 px-4 text-violet-300 font-mono text-xs whitespace-nowrap">
        ${escapeHtml(r.roll_number)}
      </td>
      <td class="py-3 px-4 text-slate-300 text-xs">
        ${escapeHtml(r.email)}
      </td>
      <td class="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
        ${escapeHtml(r.phone || '—')}
      </td>
      <td class="py-3 px-4 text-slate-200 font-medium">
        <span class="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-800 border border-slate-700">
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
          class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
          title="Cancel this registration"
        >
          Cancel Seat
        </button>
      </td>
    `;
    registrationsTableBody.appendChild(tr);
  });
}

function populateEventFilterDropdown(events) {
  const currentVal = eventFilterSelect.value;
  eventFilterSelect.innerHTML = '<option value="">All Events (Show All Registrations)</option>';
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${ev.icon || ''} ${ev.title} (#${ev.id})`;
    eventFilterSelect.appendChild(opt);
  });
  eventFilterSelect.value = currentVal;
}

// -------------------------------------------------------------
// Stretch Goal 1: Add Event Form Submission (POST /api/events)
// -------------------------------------------------------------
async function handleAddEventSubmit(e) {
  e.preventDefault();
  addEventError.classList.add('hidden');

  const title = document.getElementById('new-event-title').value.trim();
  const category = document.getElementById('new-event-category').value;
  const icon = document.getElementById('new-event-icon').value.trim() || '🎉';
  const event_date = document.getElementById('new-event-date').value;
  const event_time = document.getElementById('new-event-time').value.trim();
  const venue = document.getElementById('new-event-venue').value.trim();
  const capacity = parseInt(document.getElementById('new-event-capacity').value, 10);
  const fee = parseInt(document.getElementById('new-event-fee').value, 10) || 0;
  const description = document.getElementById('new-event-description').value.trim();

  // Basic validation
  if (!title || !category || !event_date || !event_time || !venue || isNaN(capacity) || capacity <= 0) {
    addEventError.textContent = 'Please fill out all required fields with valid values (capacity must be > 0).';
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
    addEventError.textContent = err.message || 'Failed to create event.';
    addEventError.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// Stretch Goal 2: Cancel Registration (DELETE /api/registrations/{id})
// -------------------------------------------------------------
window.promptDeleteRegistration = function(regId, studentName, eventTitle) {
  registrationToDeleteId = regId;
  deleteRegDetails.textContent = `Are you sure you want to cancel the registration for "${studentName}" for the event "${eventTitle}"? This cannot be undone.`;
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

    // Instantly refresh all data so seat count and table utilization reflect the cancellation
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
