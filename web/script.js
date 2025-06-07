// Configuration
const API_BASE_URL = 'http://localhost:8080';

// Global state
let currentUser = null;
let currentUserType = 'customer';
let events = [];
let userBookings = [];
let favoriteEvents = [];
let currentEventModal = null;

// API Helper function
async function apiCall(endpoint, method = 'GET', body = null) {
    showLoading();
    
    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    } finally {
        hideLoading();
    }
}

// Loading functions
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Utility functions
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    const span = errorElement.querySelector('span');
    if (span) {
        span.textContent = message;
    } else {
        errorElement.textContent = message;
    }
    errorElement.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    const span = successElement.querySelector('span');
    if (span) {
        span.textContent = message;
    } else {
        successElement.textContent = message;
    }
    successElement.classList.remove('hidden');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price || 0);
}

// Password functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.password-toggle');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function checkPasswordStrength(password) {
    let strength = 0;
    const checks = [
        password.length >= 8,
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (strengthBar && strengthText) {
        const percentage = (strength / 5) * 100;
        strengthBar.style.width = `${percentage}%`;
        
        if (strength < 2) {
            strengthBar.style.background = '#ef4444';
            strengthText.textContent = 'Weak password';
        } else if (strength < 4) {
            strengthBar.style.background = '#f59e0b';
            strengthText.textContent = 'Medium password';
        } else {
            strengthBar.style.background = '#10b981';
            strengthText.textContent = 'Strong password';
        }
    }
}

// User type selection
function setUserType(type) {
    currentUserType = type;
    document.querySelectorAll('.user-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
}

// User menu functions
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown') || document.getElementById('adminUserDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = e.target.closest('.user-menu');
    if (!userMenu) {
        const dropdowns = document.querySelectorAll('.user-dropdown');
        dropdowns.forEach(dropdown => dropdown.classList.add('hidden'));
    }
});

// API functions
async function register(userData) {
    try {
        const response = await apiCall('/v1/users/register', 'POST', {
            email: userData.email,
            password: userData.password,
            first_name: userData.firstName,
            last_name: userData.lastName,
            username: userData.username,
            phone: userData.phone
        });
        
        return { success: true, data: response };
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function login(username, password) {
    try {
        const response = await apiCall('/v1/users/login', 'POST', {
            username: username,
            password: password,
            user_id: ""
        });
        
        // Handle successful login
        if (currentUserType === 'admin' && username === 'admin') {
            currentUser = { username: username, role: 'admin' };
            document.getElementById('welcomeAdmin').textContent = `Welcome, ${username}`;
            hideElement('loginPage');
            showElement('adminDashboard');
            showAdminDashboard();
        } else {
            currentUser = { username: username, role: 'customer' };
            document.getElementById('welcomeCustomer').textContent = `Welcome, ${username}`;
            hideElement('loginPage');
            showElement('customerDashboard');
            showCustomerDashboard();
        }
        
        await loadEvents();
        showToast('Login successful!', 'success');
        return { success: true, data: response };
    } catch (error) {
        console.error('Login error:', error);
        throw new Error('Invalid credentials or server error');
    }
}

async function createEvent(eventData) {
    try {
        const response = await apiCall('/v1/event/create', 'POST', {
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            event_location: eventData.event_location,
            event_date: eventData.event_date,
            event_start_time: eventData.event_start_time,
            event_end_time: eventData.event_end_time,
            created_by: eventData.created_by,
            total_slots: eventData.total_slots
        });
        
        await loadEvents();
        return { success: true, data: response };
    } catch (error) {
        console.error('Create event error:', error);
        throw error;
    }
}

async function loadEvents() {
    try {
        const response = await apiCall('/v1/events?page=1&limit=100');
        events = response.events || [];
        renderEvents();
        updateStats();
    } catch (error) {
        console.error('Load events error:', error);
        events = [];
        renderEvents();
    }
}

async function getEventDetails(eventId) {
    try {
        const response = await apiCall(`/v1/events/${eventId}`);
        return response;
    } catch (error) {
        console.error('Get event details error:', error);
        throw error;
    }
}

async function bookEvent(eventId) {
    try {
        // Simulate booking since endpoint doesn't exist yet
        const event = events.find(e => e.event_id === eventId);
        if (event) {
            const booking = {
                ...event,
                booking_date: new Date().toISOString(),
                booking_id: Math.random().toString(36).substr(2, 9),
                status: 'confirmed'
            };
            userBookings.push(booking);
            
            // Decrease available slots
            event.total_slots = Math.max(0, event.total_slots - 1);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Book event error:', error);
        throw error;
    }
}

// UI Navigation functions
function showLogin() {
    hideElement('signupPage');
    showElement('loginPage');
    hideError('loginError');
}

function showSignup() {
    hideElement('loginPage');
    showElement('signupPage');
    hideError('signupError');
}

function showCustomerDashboard() {
    hideElement('myBookingsContent');
    hideElement('favoritesContent');
    showElement('customerDashboardContent');
    updateNavActive('customerDashboard', 0);
    renderCustomerEvents();
}

function showMyBookings() {
    hideElement('customerDashboardContent');
    hideElement('favoritesContent');
    showElement('myBookingsContent');
    updateNavActive('customerDashboard', 1);
    renderMyBookings();
}

function showFavorites() {
    hideElement('customerDashboardContent');
    hideElement('myBookingsContent');
    showElement('favoritesContent');
    updateNavActive('customerDashboard', 2);
    renderFavorites();
}

function showAdminDashboard() {
    hideElement('createEventContent');
    hideElement('manageEventsContent');
    hideElement('analyticsContent');
    showElement('adminDashboardContent');
    updateNavActive('adminDashboard', 0);
    renderAdminEvents();
}

function showCreateEvent() {
    hideElement('adminDashboardContent');
    hideElement('manageEventsContent');
    hideElement('analyticsContent');
    showElement('createEventContent');
    updateNavActive('adminDashboard', 1);
    hideError('createEventError');
    hideElement('createEventSuccess');
}

function showManageEvents() {
    hideElement('adminDashboardContent');
    hideElement('createEventContent');
    hideElement('analyticsContent');
    showElement('manageEventsContent');
    updateNavActive('adminDashboard', 2);
    renderManageEvents();
}

function showAnalytics() {
    hideElement('adminDashboardContent');
    hideElement('createEventContent');
    hideElement('manageEventsContent');
    showElement('analyticsContent');
    updateNavActive('adminDashboard', 3);
}

function updateNavActive(dashboard, index) {
    const navItems = document.querySelectorAll(`#${dashboard} .nav-item`);
    navItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function logout() {
    currentUser = null;
    events = [];
    userBookings = [];
    favoriteEvents = [];
    hideElement('customerDashboard');
    hideElement('adminDashboard');
    showElement('loginPage');
    
    // Clear forms
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    document.getElementById('createEventForm').reset();
    
    showToast('Logged out successfully', 'info');
}

// Search and filter functions
function searchEvents() {
    const searchTerm = document.getElementById('heroSearchInput').value.toLowerCase();
    const location = document.getElementById('locationInput').value.toLowerCase();
    const date = document.getElementById('dateInput').value;
    
    let filteredEvents = events;
    
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(event => 
            event.event_title.toLowerCase().includes(searchTerm) ||
            event.event_description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (location) {
        filteredEvents = filteredEvents.filter(event => 
            event.event_location.toLowerCase().includes(location)
        );
    }
    
    if (date) {
        filteredEvents = filteredEvents.filter(event => 
            event.event_date === date
        );
    }
    
    renderFilteredEvents(filteredEvents);
    showToast(`Found ${filteredEvents.length} events`, 'info');
}

function filterByCategory(category) {
    // Since category is not in the current API, we'll simulate it
    showToast(`Filtering by ${category} category`, 'info');
    renderCustomerEvents();
}

function sortEvents() {
    const sortBy = document.getElementById('sortSelect').value;
    let sortedEvents = [...events];
    
    switch (sortBy) {
        case 'date':
            sortedEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            break;
        case 'popularity':
            sortedEvents.sort((a, b) => b.total_slots - a.total_slots);
            break;
        case 'price':
            // Since price is not in current API, we'll use slots as proxy
            sortedEvents.sort((a, b) => a.total_slots - b.total_slots);
            break;
    }
    
    renderFilteredEvents(sortedEvents);
}

function toggleFilters() {
    const filtersPanel = document.getElementById('filtersPanel');
    filtersPanel.classList.toggle('hidden');
}

// Render functions
function renderEvents() {
    if (currentUser?.role === 'customer') {
        renderCustomerEvents();
    } else if (currentUser?.role === 'admin') {
        renderAdminEvents();
    }
}

function renderFilteredEvents(filteredEvents) {
    const eventsGrid = document.getElementById('customerEventsGrid');
    renderEventsGrid(filteredEvents, eventsGrid, 'customer');
}

function renderCustomerEvents() {
    const eventsGrid = document.getElementById('customerEventsGrid');
    renderEventsGrid(events, eventsGrid, 'customer');
}

function renderMyBookings() {
    const bookingsGrid = document.getElementById('bookingsGrid');
    
    if (userBookings.length === 0) {
        bookingsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h3>No Bookings Yet</h3>
                <p>Book some events to see them here!</p>
            </div>
        `;
        return;
    }

    renderEventsGrid(userBookings, bookingsGrid, 'booking');
}

function renderFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    
    if (favoriteEvents.length === 0) {
        favoritesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>No Favorites Yet</h3>
                <p>Add events to your favorites to see them here!</p>
            </div>
        `;
        return;
    }

    renderEventsGrid(favoriteEvents, favoritesGrid, 'favorite');
}

function renderAdminEvents() {
    const eventsGrid = document.getElementById('adminEventsGrid');
    renderEventsGrid(events.slice(0, 6), eventsGrid, 'admin');
}

function renderManageEvents() {
    const eventsGrid = document.getElementById('manageEventsGrid');
    renderEventsGrid(events, eventsGrid, 'manage');
}

function renderEventsGrid(eventsList, container, type) {
    if (eventsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Events Available</h3>
                <p>Check back later for exciting events!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = eventsList.map(event => {
        const isFavorite = favoriteEvents.some(fav => fav.event_id === event.event_id);
        const eventImage = getEventImage(event.event_title);
        const eventCategory = getEventCategory(event.event_title);
        
        return `
            <div class="event-card" onclick="openEventModal('${event.event_id}')">
                <div class="event-image">
                    <img src="${eventImage}" alt="${event.event_title}" loading="lazy">
                    <div class="event-badge">${eventCategory}</div>
                    ${type === 'customer' ? `
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleFavorite('${event.event_id}')"
                                title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="fas fa-heart"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="event-content">
                    <div class="event-title">${event.event_title}</div>
                    <div class="event-description">${event.event_description}</div>
                    <div class="event-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(event.event_date)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${formatTime(event.event_start_time)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.event_location}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${event.total_slots} slots</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        ${type === 'customer' ? `
                            <div class="event-price">${formatPrice(Math.random() * 100 + 20)}</div>
                            <button class="btn btn-primary" onclick="event.stopPropagation(); bookEventHandler('${event.event_id}')">
                                <i class="fas fa-ticket-alt"></i>
                                Book Now
                            </button>
                        ` : type === 'booking' ? `
                            <div class="booking-status">
                                <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                                Confirmed
                            </div>
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); viewTicket('${event.booking_id}')">
                                <i class="fas fa-eye"></i>
                                View Ticket
                            </button>
                        ` : type === 'manage' ? `
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); editEventHandler('${event.event_id}')">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="event.stopPropagation(); deleteEventHandler('${event.event_id}')">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getEventImage(title) {
    // Return different images based on event title keywords
    const images = [
        'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
        'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
        'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
        'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg',
        'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg'
    ];
    
    const hash = title.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    return images[Math.abs(hash) % images.length];
}

function getEventCategory(title) {
    const categories = {
        'music': ['concert', 'festival', 'band', 'singer', 'music'],
        'sports': ['game', 'match', 'tournament', 'sports', 'football', 'basketball'],
        'business': ['conference', 'meeting', 'workshop', 'seminar', 'business'],
        'arts': ['exhibition', 'gallery', 'art', 'painting', 'sculpture'],
        'food': ['food', 'restaurant', 'cooking', 'chef', 'cuisine'],
        'tech': ['tech', 'technology', 'coding', 'programming', 'software']
    };
    
    const lowerTitle = title.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerTitle.includes(keyword))) {
            return category.charAt(0).toUpperCase() + category.slice(1);
        }
    }
    
    return 'General';
}

// Modal functions
function openEventModal(eventId) {
    const event = events.find(e => e.event_id === eventId) || 
                  userBookings.find(b => b.event_id === eventId);
    
    if (!event) return;
    
    currentEventModal = event;
    
    document.getElementById('modalEventTitle').textContent = event.event_title;
    document.getElementById('modalEventDate').textContent = formatDate(event.event_date);
    document.getElementById('modalEventTime').textContent = `${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}`;
    document.getElementById('modalEventLocation').textContent = event.event_location;
    document.getElementById('modalEventSlots').textContent = `${event.total_slots} slots available`;
    document.getElementById('modalEventDescription').textContent = event.event_description;
    document.getElementById('modalEventImage').src = getEventImage(event.event_title);
    document.getElementById('modalEventCategory').textContent = getEventCategory(event.event_title);
    
    const bookBtn = document.getElementById('modalBookBtn');
    if (currentUser?.role === 'customer') {
        bookBtn.style.display = 'flex';
        bookBtn.onclick = () => bookEventFromModal();
    } else {
        bookBtn.style.display = 'none';
    }
    
    showElement('eventModal');
}

function closeEventModal() {
    hideElement('eventModal');
    currentEventModal = null;
}

function bookEventFromModal() {
    if (currentEventModal) {
        bookEventHandler(currentEventModal.event_id);
        closeEventModal();
    }
}

// Event handlers
async function bookEventHandler(eventId) {
    try {
        await bookEvent(eventId);
        showToast('Event booked successfully!', 'success');
        renderEvents();
        renderMyBookings();
    } catch (error) {
        showToast('Failed to book event: ' + error.message, 'error');
    }
}

function toggleFavorite(eventId) {
    const event = events.find(e => e.event_id === eventId);
    if (!event) return;
    
    const existingIndex = favoriteEvents.findIndex(fav => fav.event_id === eventId);
    
    if (existingIndex > -1) {
        favoriteEvents.splice(existingIndex, 1);
        showToast('Removed from favorites', 'info');
    } else {
        favoriteEvents.push(event);
        showToast('Added to favorites', 'success');
    }
    
    renderEvents();
    renderFavorites();
}

function editEventHandler(eventId) {
    showToast('Edit functionality will be implemented soon', 'info');
}

function deleteEventHandler(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        showToast('Delete functionality will be implemented soon', 'info');
    }
}

function viewTicket(bookingId) {
    showToast('Ticket view will be implemented soon', 'info');
}

// Booking tabs
function showBookingsTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter bookings based on tab
    let filteredBookings = userBookings;
    
    switch (tab) {
        case 'upcoming':
            filteredBookings = userBookings.filter(booking => 
                new Date(booking.event_date) >= new Date()
            );
            break;
        case 'past':
            filteredBookings = userBookings.filter(booking => 
                new Date(booking.event_date) < new Date()
            );
            break;
        case 'cancelled':
            filteredBookings = userBookings.filter(booking => 
                booking.status === 'cancelled'
            );
            break;
    }
    
    const bookingsGrid = document.getElementById('bookingsGrid');
    renderEventsGrid(filteredBookings, bookingsGrid, 'booking');
}

// Stats update
function updateStats() {
    if (currentUser?.role === 'admin') {
        document.getElementById('totalEvents').textContent = events.length;
        document.getElementById('totalBookings').textContent = userBookings.length;
        document.getElementById('totalRevenue').textContent = formatPrice(events.length * 50);
        document.getElementById('avgRating').textContent = '4.8';
    }
}

// Form event listeners
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    hideError('loginError');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing In...</span>';
    
    try {
        await login(username, password);
    } catch (error) {
        showError('loginError', error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: document.getElementById('password').value
    };
    
    const signupBtn = document.getElementById('signupBtn');
    
    hideError('signupError');
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating Account...</span>';
    
    try {
        await register(userData);
        showToast('Account created successfully! Please sign in.', 'success');
        showLogin();
        document.getElementById('signupForm').reset();
    } catch (error) {
        showError('signupError', error.message || 'Failed to create account');
    } finally {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Create Account</span>';
    }
});

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventData = {
        event_title: document.getElementById('eventTitle').value,
        event_description: document.getElementById('eventDescription').value,
        event_location: document.getElementById('eventLocation').value,
        event_date: document.getElementById('eventDate').value,
        event_start_time: document.getElementById('startTime').value,
        event_end_time: document.getElementById('endTime').value,
        total_slots: parseInt(document.getElementById('totalSlots').value),
        created_by: currentUser.username
    };
    
    const createBtn = document.getElementById('createEventBtn');
    
    hideError('createEventError');
    hideElement('createEventSuccess');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating Event...</span>';
    
    try {
        await createEvent(eventData);
        showSuccess('createEventSuccess', 'Event created successfully!');
        showToast('Event created successfully!', 'success');
        document.getElementById('createEventForm').reset();
        renderEvents();
    } catch (error) {
        showError('createEventError', error.message || 'Failed to create event');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>Create Event</span>';
    }
});

// Password strength checker
document.getElementById('password')?.addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
});

// Search functionality
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length > 2) {
        const filteredEvents = events.filter(event => 
            event.event_title.toLowerCase().includes(searchTerm) ||
            event.event_description.toLowerCase().includes(searchTerm) ||
            event.event_location.toLowerCase().includes(searchTerm)
        );
        renderFilteredEvents(filteredEvents);
    } else if (searchTerm.length === 0) {
        renderCustomerEvents();
    }
});

// Price range filter
document.getElementById('priceRange')?.addEventListener('input', (e) => {
    document.getElementById('priceValue').textContent = formatPrice(e.target.value);
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date for event creation to today
    const today = new Date().toISOString().split('T')[0];
    const eventDateInput = document.getElementById('eventDate');
    if (eventDateInput) {
        eventDateInput.setAttribute('min', today);
    }
    
    const dateInput = document.getElementById('dateInput');
    if (dateInput) {
        dateInput.setAttribute('min', today);
    }
    
    // Initialize price range display
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceValue.textContent = formatPrice(priceRange.value);
    }
    
    console.log('EventPass application initialized');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        closeEventModal();
        
        // Close user dropdown
        const dropdowns = document.querySelectorAll('.user-dropdown');
        dropdowns.forEach(dropdown => dropdown.classList.add('hidden'));
    }
    
    // Quick search with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput') || document.getElementById('heroSearchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
