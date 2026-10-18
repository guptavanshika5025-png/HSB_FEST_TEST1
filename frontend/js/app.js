/**
 * Zenith '26 Fest Management System — Student Portal JavaScript
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

// Category Visual Configuration
const CATEGORY_STYLES = {
  Technical: {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    bar: 'from-blue-500 to-indigo-500',
  },
  Cultural: {
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    bar: 'from-pink-500 to-rose-500',
  },
  Sports: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bar: 'from-emerald-500 to-teal-500',
  },
  Gaming: {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    bar: 'from-purple-500 to-violet-500',
  },
  Workshop: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bar: 'from-amber-500 to-orange-500',
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

      // Update active button styling
      categoryButtons.forEach(b => {
        b.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60';
      });
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-violet-600 text-white shadow-md shadow-violet-600/30';

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
// Fetch Events from Backend API (Step 3 & 6)
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
      'Unable to load events from the server.',
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

  // Update header count badge
  if (events.length === 1) {
    eventsCountBadge.textContent = 'Showing 1 event';
  } else {
    eventsCountBadge.textContent = `Showing ${events.length} events`;
  }

  // Handle empty state (Step 9)
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
// Card DOM Element Generator
// -------------------------------------------------------------
function createEventCard(event, index) {
  const card = document.createElement('div');
  card.className = 'group relative flex flex-col bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-violet-500/50 rounded-2xl p-5 shadow-lg hover:shadow-xl hover:shadow-violet-950/30 transition-all duration-300 card-fade';
  card.style.animationDelay = `${index * 40}ms`;

  const isFull = event.available_seats <= 0;
  const bookedSeats = event.capacity - event.available_seats;
  const fillPct = Math.min(100, Math.round((bookedSeats / event.capacity) * 100));

  const catStyle = CATEGORY_STYLES[event.category] || {
    badge: 'bg-slate-700 text-slate-300 border-slate-600',
    bar: 'from-violet-500 to-indigo-500',
  };

  const feeDisplay = event.fee > 0 ? `₹${event.fee}` : 'Free';
  const feeClass = event.fee > 0 
    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';

  card.innerHTML = `
    <!-- Top Row: Icon + Category Badge + Fee -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl p-2 bg-slate-900/80 rounded-xl border border-slate-700/60 shadow-inner group-hover:scale-110 transition-transform">
          ${event.icon || '⚡'}
        </span>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-lg border ${catStyle.badge}">
          ${event.category}
        </span>
      </div>
      <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${feeClass}">
        ${feeDisplay}
      </span>
    </div>

    <!-- Title -->
    <h3 class="text-lg font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 mb-1">
      ${escapeHtml(event.title)}
    </h3>

    <!-- Date, Time, Venue -->
    <div class="space-y-1 text-xs text-slate-300 mb-4">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>${formatDate(event.event_date)} • ${event.event_time}</span>
      </div>
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span class="truncate">${escapeHtml(event.venue)}</span>
      </div>
    </div>

    <!-- Description snippet -->
    <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed flex-grow">
      ${escapeHtml(event.description || 'Join this exciting event at Zenith 26!')}
    </p>

    <!-- Seats / Capacity Indicator (Step 6 requirement) -->
    <div class="pt-3 border-t border-slate-700/60 mt-auto">
      <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
        <span class="text-slate-400">Available Seats:</span>
        ${isFull ? `
          <span class="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            FULL
          </span>
        ` : `
          <span class="text-slate-200 font-bold">
            <span class="${event.available_seats <= 10 ? 'text-amber-400' : 'text-emerald-400'}">${event.available_seats}</span> / ${event.capacity} left
          </span>
        `}
      </div>

      <!-- Capacity Progress Bar -->
      <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-4">
        <div class="h-1.5 rounded-full bg-gradient-to-r ${isFull ? 'from-rose-500 to-red-600' : catStyle.bar}" style="width: ${fillPct}%"></div>
      </div>

      <!-- Action Button -->
      <button 
        type="button" 
        class="view-details-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
          isFull 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600' 
            : 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-md shadow-violet-600/25'
        }"
        data-event-id="${event.id}"
      >
        <span>View Details</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
// Modal & Registration Flow (Step 7)
// -------------------------------------------------------------
async function openEventModal(eventId) {
  // Reset form and alerts
  resetRegistrationForm();

  // Show modal immediately with loading state
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
    showModalFormError('Unable to load event details. Please try again.');
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
  modalEventFee.textContent = event.fee > 0 ? `₹${event.fee}` : 'Free';
  modalEventDescription.textContent = event.description || 'No detailed description provided.';

  // Seats bar in modal
  const isFull = event.available_seats <= 0;
  const bookedSeats = event.capacity - event.available_seats;
  const fillPct = Math.min(100, Math.round((bookedSeats / event.capacity) * 100));

  modalSeatsProgress.style.width = `${fillPct}%`;

  if (isFull) {
    modalSeatsText.innerHTML = `<span class="text-rose-400 font-bold">FULL (0 / ${event.capacity} seats remaining)</span>`;
    modalSeatsProgress.className = 'h-2 rounded-full bg-rose-500 transition-all duration-500';
    registrationForm.classList.add('hidden');
    modalFullAlert.classList.remove('hidden');
  } else {
    modalSeatsText.innerHTML = `<span class="text-emerald-400 font-bold">${event.available_seats}</span> / ${event.capacity} seats remaining`;
    modalSeatsProgress.className = 'h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500';
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

  // Client-Side Validation (Step 7 requirement: do not bypass server-side validation!)
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
    showModalFormError('Please complete all required fields correctly before submitting.');
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
      `You are successfully registered for "${activeEventData ? activeEventData.title : 'the event'}". Check your college inbox for updates.`
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
    showModalFormError('Network communication failed. Please check your connection and try again.');
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
    btnText.textContent = 'Registering...';
  } else {
    regSubmitBtn.disabled = false;
    btnSpinner.classList.add('hidden');
    btnText.textContent = 'Confirm Registration';
  }
}

// -------------------------------------------------------------
// State Containers: Loading, Error, Empty (Step 9)
// -------------------------------------------------------------
function showLoadingState() {
  eventsCountBadge.textContent = 'Loading events...';
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mb-4"></div>
      <h3 class="text-lg font-bold text-white mb-1">Loading Fest Events</h3>
      <p class="text-sm text-slate-400">Fetching live schedule and available seats from the server...</p>
    </div>
  `;
}

function showErrorState(title, message) {
  eventsCountBadge.textContent = 'Error loading events';
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="max-w-md mx-auto my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
      <div class="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h3 class="text-base font-bold text-rose-200 mb-1">${escapeHtml(title)}</h3>
      <p class="text-xs text-rose-300/80 mb-4">${escapeHtml(message)}</p>
      <button 
        onclick="fetchEvents()" 
        class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
      >
        Retry Connection
      </button>
    </div>
  `;
}

function showEmptyState() {
  eventsGrid.classList.add('hidden');
  stateContainer.classList.remove('hidden');
  stateContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div class="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl mb-3 shadow-inner">
        🔍
      </div>
      <h3 class="text-lg font-bold text-white mb-1">No events match your criteria</h3>
      <p class="text-xs text-slate-400 mb-4">
        We couldn't find any events matching "${escapeHtml(currentSearch || currentCategory)}". Try clearing your search or switching categories.
      </p>
      <button 
        onclick="resetFilters()" 
        class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-violet-300 text-xs font-semibold transition-colors cursor-pointer"
      >
        Reset Filters
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
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-violet-600 text-white shadow-md shadow-violet-600/30';
    } else {
      btn.className = 'category-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60';
    }
  });
  fetchEvents();
};

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Convert 2026-11-14 to "14 Nov 2026" or similar
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[monthIdx]} ${parts[0]}`;
    }
  } catch (e) {
    // fallback
  }
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
