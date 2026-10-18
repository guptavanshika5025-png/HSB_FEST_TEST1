/**
 * Zenith '26 Fest Management System — Cosmic Universe Student Portal JavaScript
 * Handles live event fetching, API query filtering, modal interactions,
 * client-side & server-side validation, and instant registration updates.
 */

// Application State
let currentCategory = 'All';
let currentSearch = '';
let searchDebounceTimer = null;
let activeEventData = null;

// DOM Elements
const eventsGrid = document.getElementById('events-grid');
const stateContainer = document.getElementById('state-container');
const eventsCountBadge = document.getElementById('events-count-badge');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryButtons = document.querySelectorAll('.category-btn');

// Mobile Menu Elements
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const menuIconOpen = document.getElementById('menu-icon-open');
const menuIconClose = document.getElementById('menu-icon-close');

// Modal Elements
const modal = document.getElementById('registration-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDismissBtn = document.getElementById('modal-dismiss-btn');
const modalEventIcon = document.getElementById('modal-event-icon');
const modalEventCategory = document.getElementById('modal-event-category');
const modalEventTitle = document.getElementById('modal-event-title');
const modalEventDate = document.getElementById('modal-event-date');
const modalEventTime = document.getElementById('modal-event-time');
const modalEventVenue = document.getElementById('modal-event-venue');
const modalEventFee = document.getElementById('modal-event-fee');
const modalEventDescription = document.getElementById('modal-event-description');
const modalSeatsText = document.getElementById('modal-seats-text');
const modalSeatsProgress = document.getElementById('modal-seats-progress');

// Form Elements
const registrationForm = document.getElementById('registration-form');
const formEventId = document.getElementById('form-event-id');
const regStudentName = document.getElementById('reg-student-name');
const regRollNumber = document.getElementById('reg-roll-number');
const regEmail = document.getElementById('reg-email');
const regPhone = document.getElementById('reg-phone');
const regSubmitBtn = document.getElementById('reg-submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');

// Alert Elements
const formErrorAlert = document.getElementById('form-error-alert');
const formErrorText = document.getElementById('form-error-text');
const formSuccessAlert = document.getElementById('form-success-alert');
const formSuccessText = document.getElementById('form-success-text');
const modalFullAlert = document.getElementById('modal-full-alert');
const modalRegSection = document.getElementById('modal-registration-section');

// Cosmic Universe Category Visual Configuration
const CATEGORY_STYLES = {
  Technical: {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]',
    bar: 'from-cyan-400 to-blue-600',
  },
  Cultural: {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(124,58,237,0.2)]',
    bar: 'from-purple-500 to-violet-600',
  },
  Sports: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    bar: 'from-emerald-400 to-teal-600',
  },
  Gaming: {
    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_8px_rgba(217,70,239,0.2)]',
    bar: 'from-fuchsia-500 to-indigo-600',
  },
  Workshop: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    bar: 'from-amber-400 to-orange-500',
  },
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchEvents();
});

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  // Mobile navigation menu toggle
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = !mobileMenu.classList.contains('hidden');
      if (isExpanded) {
        mobileMenu.classList.add('hidden');
        menuIconOpen.classList.remove('hidden');
        menuIconClose.classList.add('hidden');
      } else {
        mobileMenu.classList.remove('hidden');
        menuIconOpen.classList.add('hidden');
        menuIconClose.classList.remove('hidden');
      }
    });
  }

  // Category filter buttons
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedCategory = btn.getAttribute('data-category');
      if (currentCategory === selectedCategory) return;

      currentCategory = selectedCategory;

      // Update active button styling with Cosmic glow
      categoryButtons.forEach(b => {
        b.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-space font-medium transition-all bg-[#0B102F]/80 text-cosmic-lavender hover:bg-slate-800 hover:text-white border border-purple-500/20 hover:border-cyan-500/40 shrink-0';
      });
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-space font-semibold transition-all bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-cyan-400/50 shrink-0';

      fetchEvents();
    });
  });

  // Search input with debounce (queries API)
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();

    if (currentSearch.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchEvents();
    }, 300);
  });

  // Clear search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    clearSearchBtn.classList.add('hidden');
    fetchEvents();
  });

  // Modal close listeners
  modalCloseBtn.addEventListener('click', closeModal);
  modalDismissBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Registration Form Submission
  registrationForm.addEventListener('submit', handleRegistrationSubmit);
}

// -------------------------------------------------------------
// Fetch Events from Backend API
// -------------------------------------------------------------
async function fetchEvents() {
  showLoadingState();

  try {
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== 'All') {
      params.append('category', currentCategory);
    }
    if (currentSearch) {
      params.append('search', currentSearch);
    }

    const url = `/api/events${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const events = await response.json();
    renderEvents(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    showErrorState(
      'COMMUNICATION LINK FAILURE: UNABLE TO CONNECT TO COMMAND SERVER',
      'Make sure the FastAPI backend is running locally on port 9000.'
    );
  }
}

// -------------------------------------------------------------
// Render Events Grid
// -------------------------------------------------------------
function renderEvents(events) {
  stateContainer.classList.add('hidden');
  eventsGrid.classList.remove('hidden');
  eventsGrid.innerHTML = '';

  // Update header count badge with telemetry font
  if (events.length === 1) {
    eventsCountBadge.textContent = 'TELEMETRY: 1 MODULE ACTIVE';
  } else {
    eventsCountBadge.textContent = `TELEMETRY: ${events.length} MODULES ACTIVE`;
  }

  // Handle empty state
  if (events.length === 0) {
    showEmptyState();
    return;
  }

  events.forEach((event, index) => {
    const card = createEventCard(event, index);
    eventsGrid.appendChild(card);
  });
}

// -------------------------------------------------------------
// Holographic Spacecraft Module Card Generator
// -------------------------------------------------------------
function createEventCard(event, index) {
  const card = document.createElement('div');
  card.className = 'cosmic-panel rounded-2xl p-5 relative flex flex-col group card-fade border border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,229,255,0.2)] transition-all duration-300';
  card.style.animationDelay = `${index * 45}ms`;

  const isFull = event.available_seats <= 0;
  const bookedSeats = event.capacity - event.available_seats;
  const fillPct = Math.min(100, Math.round((bookedSeats / event.capacity) * 100));

  const catStyle = CATEGORY_STYLES[event.category] || {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    bar: 'from-violet-500 to-indigo-500',
  };

  const feeDisplay = event.fee > 0 ? `₹${event.fee}` : 'COMPLIMENTARY ACCESS';
  const feeClass = event.fee > 0 
    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[10px]' 
    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]';

  card.innerHTML = `
    <!-- Top Row: Icon + Category Badge + Fee -->
    <div class="flex items-start justify-between gap-2 mb-3.5">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl p-2 bg-[#080B2A]/90 rounded-xl border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all">
          ${event.icon || '⚡'}
        </span>
        <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${catStyle.badge} uppercase tracking-wider">
          ${event.category}
        </span>
      </div>
      <span class="px-2.5 py-1 rounded-lg font-bold tracking-wider ${feeClass}">
        ${feeDisplay}
      </span>
    </div>

    <!-- Title -->
    <h3 class="font-orbitron text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1.5 tracking-wide">
      ${escapeHtml(event.title)}
    </h3>

    <!-- Date, Time, Venue -->
    <div class="space-y-1.5 text-xs text-cosmic-lavender font-space mb-4">
      <div class="flex items-center gap-2 font-mono">
        <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span class="text-slate-300">${formatDate(event.event_date)} • ${event.event_time}</span>
      </div>
      <div class="flex items-center gap-2 font-mono">
        <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span class="truncate text-slate-300">${escapeHtml(event.venue)}</span>
      </div>
    </div>

    <!-- Description snippet -->
    <p class="text-xs text-slate-300 font-space line-clamp-2 mb-4 leading-relaxed flex-grow">
      ${escapeHtml(event.description || 'Access mission telemetry and join celestial operations at Zenith 26.')}
    </p>

    <!-- Seats / Capacity Indicator -->
    <div class="pt-3 border-t border-cyan-500/20 mt-auto">
      <div class="flex items-center justify-between text-xs mb-1.5 font-mono font-medium">
        <span class="text-slate-400 uppercase text-[11px] tracking-wider">Orbital Capacity:</span>
        ${isFull ? `
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
            SECTOR FULL
          </span>
        ` : `
          <span class="text-slate-200 font-bold">
            <span class="${event.available_seats <= 10 ? 'text-amber-400' : 'text-cyan-300'}">${event.available_seats}</span> / ${event.capacity} SLOTS
          </span>
        `}
      </div>

      <!-- Capacity Progress Bar with Cosmic Neon Glow -->
      <div class="w-full bg-[#080B2A] rounded-full h-1.5 overflow-hidden mb-4 border border-slate-800">
        <div class="h-1.5 rounded-full bg-gradient-to-r ${isFull ? 'from-rose-500 to-red-600 shadow-[0_0_8px_#F43F5E]' : catStyle.bar + ' shadow-[0_0_8px_#00E5FF]'}" style="width: ${fillPct}%"></div>
      </div>

      <!-- Action Button -->
      <button 
        type="button" 
        class="view-details-btn w-full py-2.5 px-4 rounded-xl text-xs font-orbitron font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          isFull 
            ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border border-slate-700/50' 
            : 'btn-cosmic-primary'
        }"
        data-event-id="${event.id}"
      >
        <span>MISSION DETAILS</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  `;

  // Attach click handler to View Details button
  const detailsBtn = card.querySelector('.view-details-btn');
  detailsBtn.addEventListener('click', () => {
    openEventModal(event.id);
  });

  return card;
}

// -------------------------------------------------------------
// Modal & Registration Flow
// -------------------------------------------------------------
async function openEventModal(eventId) {
  // Reset form and alerts
  resetRegistrationForm();

  // Show modal immediately
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  try {
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch event detail: HTTP ${response.status}`);
    }
    const event = await response.json();
    activeEventData = event;
    populateModalData(event);
  } catch (error) {
    console.error('Error fetching event detail:', error);
    showModalFormError('Unable to load mission telemetry. Please re-engage link.');
  }
}

function populateModalData(event) {
  formEventId.value = event.id;
  modalEventIcon.textContent = event.icon || '⚡';
  modalEventCategory.textContent = event.category;
  modalEventTitle.textContent = event.title;
  modalEventDate.textContent = formatDate(event.event_date);
  modalEventTime.textContent = event.event_time;
  modalEventVenue.textContent = event.venue;
  modalEventFee.textContent = event.fee > 0 ? `₹${event.fee}` : 'COMPLIMENTARY';
  modalEventDescription.textContent = event.description || 'No detailed mission briefing provided.';

  // Seats bar in modal
  const isFull = event.available_seats <= 0;
  const bookedSeats = event.capacity - event.available_seats;
  const fillPct = Math.min(100, Math.round((bookedSeats / event.capacity) * 100));

  modalSeatsProgress.style.width = `${fillPct}%`;

  if (isFull) {
    modalSeatsText.innerHTML = `<span class="text-rose-400 font-bold font-mono">SECTOR FULL (0 / ${event.capacity} SLOTS REMAINING)</span>`;
    modalSeatsProgress.className = 'h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#F43F5E] transition-all duration-500';
    registrationForm.classList.add('hidden');
    modalFullAlert.classList.remove('hidden');
  } else {
    modalSeatsText.innerHTML = `<span class="text-cyan-300 font-bold font-mono">${event.available_seats}</span> / ${event.capacity} SLOTS AVAILABLE`;
    modalSeatsProgress.className = 'h-2 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_10px_#00E5FF] transition-all duration-500';
    registrationForm.classList.remove('hidden');
    modalFullAlert.classList.add('hidden');
  }
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  resetRegistrationForm();
  activeEventData = null;
}

function resetRegistrationForm() {
  registrationForm.reset();
  formErrorAlert.classList.add('hidden');
  formErrorText.textContent = '';
  formSuccessAlert.classList.add('hidden');
  formSuccessText.textContent = '';
  modalFullAlert.classList.add('hidden');
  registrationForm.classList.remove('hidden');

  // Clear field validation indicators
  document.getElementById('err-student-name').classList.add('hidden');
  document.getElementById('err-roll-number').classList.add('hidden');
  document.getElementById('err-email').classList.add('hidden');

  setSubmitButtonLoading(false);
}

// -------------------------------------------------------------
// Form Submission & Validation (Client & Server Validation)
// -------------------------------------------------------------
async function handleRegistrationSubmit(e) {
  e.preventDefault();

  formErrorAlert.classList.add('hidden');
  formSuccessAlert.classList.add('hidden');

  const eventId = formEventId.value;
  const studentName = regStudentName.value.trim();
  const rollNumber = regRollNumber.value.trim();
  const email = regEmail.value.trim();
  const phone = regPhone.value.trim();

  // Client-Side Validation
  let hasClientError = false;

  if (!studentName) {
    document.getElementById('err-student-name').classList.remove('hidden');
    hasClientError = true;
  } else {
    document.getElementById('err-student-name').classList.add('hidden');
  }

  if (!rollNumber) {
    document.getElementById('err-roll-number').classList.remove('hidden');
    hasClientError = true;
  } else {
    document.getElementById('err-roll-number').classList.add('hidden');
  }

  if (!email || !email.includes('@')) {
    document.getElementById('err-email').classList.remove('hidden');
    hasClientError = true;
  } else {
    document.getElementById('err-email').classList.add('hidden');
  }

  if (hasClientError) {
    showModalFormError('PROTOCOL WARNING: Required cadet identification fields must be valid.');
    return;
  }

  // Submit to Server
  setSubmitButtonLoading(true);

  try {
    const payload = {
      student_name: studentName,
      roll_number: rollNumber,
      email: email,
      phone: phone || null,
    };

    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Show exact server error message (400 / 409)
      const serverErrorMessage = responseData.detail || `Server error (HTTP ${response.status})`;
      showModalFormError(serverErrorMessage);
      setSubmitButtonLoading(false);
      return;
    }

    // Success (HTTP 201)
    setSubmitButtonLoading(false);
    showModalFormSuccess(
      `Cadet ${studentName} successfully registered for "${activeEventData ? activeEventData.title : 'the mission'}". Telemetry confirmed.`
    );

    // Hide input form to prevent double submission
    registrationForm.classList.add('hidden');

    // Instantly re-fetch the event detail to update available seats in modal
    const updatedResp = await fetch(`/api/events/${eventId}`);
    if (updatedResp.ok) {
      const updatedEvent = await updatedResp.json();
      activeEventData = updatedEvent;
      populateModalData(updatedEvent);
    }

    // Re-fetch events list to update grid counts immediately
    fetchEvents();

    // Auto close modal after 3 seconds on success
    setTimeout(() => {
      if (!modal.classList.contains('hidden')) {
        closeModal();
      }
    }, 3200);

  } catch (err) {
    console.error('Registration network error:', err);
    showModalFormError('Telemetry link interrupted. Please retry registration command.');
    setSubmitButtonLoading(false);
  }
}

function showModalFormError(message) {
  formErrorText.textContent = message;
  formErrorAlert.classList.remove('hidden');
}

function showModalFormSuccess(message) {
  formSuccessText.textContent = message;
  formSuccessAlert.classList.remove('hidden');
}

function setSubmitButtonLoading(isLoading) {
  if (isLoading) {
    regSubmitBtn.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'TRANSMITTING CREDENTIALS...';
  } else {
    regSubmitBtn.disabled = false;
    btnSpinner.classList.add('hidden');
    btnText.textContent = 'AUTHORIZE & ENROLL CADET';
  }
}

// -------------------------------------------------------------
// State Containers: Loading, Error, Empty
// -------------------------------------------------------------
function showLoadingState() {
  eventsCountBadge.textContent = 'SCANNING ORBITAL SECTOR...';
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="relative w-16 h-16 mb-4">
        <div class="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-[#00E5FF] animate-spin"></div>
        <div class="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-[#7C3AED] animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
        <div class="absolute inset-0 flex items-center justify-center text-cyan-400 font-mono text-xs">❖</div>
      </div>
      <h3 class="font-orbitron text-lg font-bold text-white mb-1 tracking-wider">SCANNING CELESTIAL FREQUENCIES</h3>
      <p class="font-space text-xs text-cosmic-lavender">Fetching live mission parameters and slot allocations from command server...</p>
    </div>
  `;
}

function showErrorState(title, message) {
  eventsCountBadge.textContent = 'TELEMETRY OFFLINE';
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="max-w-md mx-auto my-12 p-6 rounded-3xl bg-[#0B102F]/90 border border-rose-500/40 text-center shadow-[0_0_35px_rgba(244,63,94,0.2)]">
      <div class="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3.5 border border-rose-500/30">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h3 class="font-orbitron text-sm font-bold text-rose-200 mb-1 tracking-wide">${escapeHtml(title)}</h3>
      <p class="font-space text-xs text-rose-300/80 mb-5">${escapeHtml(message)}</p>
      <button 
        onclick="fetchEvents()" 
        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:brightness-110 text-white text-xs font-orbitron font-semibold shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
      >
        RE-ESTABLISH COMMS
      </button>
    </div>
  `;
}

function showEmptyState() {
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto cosmic-panel p-8 rounded-3xl">
      <div class="w-16 h-16 rounded-2xl bg-[#080B2A] border border-cyan-500/30 flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
        📡
      </div>
      <h3 class="font-orbitron text-base font-bold text-white mb-1 tracking-wide">NO SIGNALS DETECTED IN THIS SECTOR</h3>
      <p class="font-space text-xs text-cosmic-lavender mb-5">
        No active mission modules matched "${escapeHtml(currentSearch || currentCategory)}". Re-tune your frequency or clear scanner filters.
      </p>
      <button 
        onclick="resetFilters()" 
        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-800 to-cyan-600 hover:brightness-110 border border-cyan-400/40 text-white text-xs font-orbitron font-semibold tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]"
      >
        RESET SCANNER FILTERS
      </button>
    </div>
  `;
}

window.resetFilters = function() {
  searchInput.value = '';
  currentSearch = '';
  clearSearchBtn.classList.add('hidden');
  currentCategory = 'All';
  categoryButtons.forEach(btn => {
    if (btn.getAttribute('data-category') === 'All') {
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-space font-semibold transition-all bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-cyan-400/50 shrink-0';
    } else {
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-space font-medium transition-all bg-[#0B102F]/80 text-cosmic-lavender hover:bg-slate-800 hover:text-white border border-purple-500/20 hover:border-cyan-500/40 shrink-0';
    }
  });
  fetchEvents();
};

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[monthIdx]} ${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
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
