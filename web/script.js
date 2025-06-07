// Configuration
const API_BASE_URL = 'http://localhost:8080';

// Global state
let currentUser = null;
let currentUserType = 'customer';
let events = [];
let userBookings = [];

// API Helper function
async function apiCall(endpoint, method = 'GET', body = null) {
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
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    successElement.textContent = message;
    successElement.classList.remove('hidden');
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

// User type selection
function setUserType(type) {
    currentUserType = type;
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

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
            user_id: "" // Add user_id if needed based on your login logic
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
        
        // Refresh events list after creating
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
    } catch (error) {
        console.error('Load events error:', error);
        // Fallback to empty array if API fails
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

// Note: You'll need to add booking endpoints to your proto files
async function bookEvent(eventId) {
    try {
        // This endpoint needs to be added to your proto files
        const response = await apiCall(`/v1/events/${eventId}/book`, 'POST', {
            user_id: currentUser.username // or actual user ID
        });
        
        // Add to local bookings for now
        const event = events.find(e => e.event_id === eventId);
        if (event) {
            userBookings.push({
                ...event,
                booking_date: new Date().toISOString(),
                booking_id: Math.random().toString(36).substr(2, 9)
            });
        }
        
        await loadEvents(); // Refresh events to update available slots
        return { success: true, data: response };
    } catch (error) {
        console.error('Book event error:', error);
        throw error;
    }
}

// UI functions
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
    showElement('customerDashboardContent');
    updateNavActive('customerDashboard', 0);
    renderCustomerEvents();
}

function showMyBookings() {
    hideElement('customerDashboardContent');
    showElement('myBookingsContent');
    updateNavActive('customerDashboard', 1);
    renderMyBookings();
}

function showAdminDashboard() {
    hideElement('createEventContent');
    hideElement('manageEventsContent');
    showElement('adminDashboardContent');
    updateNavActive('adminDashboard', 0);
    renderAdminEvents();
}

function showCreateEvent() {
    hideElement('adminDashboardContent');
    hideElement('manageEventsContent');
    showElement('createEventContent');
    updateNavActive('adminDashboard', 1);
    hideError('createEventError');
    hideElement('createEventSuccess');
}

function showManageEvents() {
    hideElement('adminDashboardContent');
    hideElement('createEventContent');
    showElement('manageEventsContent');
    updateNavActive('adminDashboard', 2);
    renderManageEvents();
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
    hideElement('customerDashboard');
    hideElement('adminDashboard');
    showElement('loginPage');
    
    // Clear forms
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    document.getElementById('createEventForm').reset();
}

function renderEvents() {
    if (currentUser?.role === 'customer') {
        renderCustomerEvents();
    } else if (currentUser?.role === 'admin') {
        renderAdminEvents();
    }
}

function renderCustomerEvents() {
    const eventsGrid = document.getElementById('customerEventsGrid');
    
    if (events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path>
                </svg>
                <h3>No Events Available</h3>
                <p>Check back later for exciting events!</p>
            </div>
        `;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail">
                    <span>📅</span> ${formatDate(event.event_date)}
                </div>
                <div class="event-detail">
                    <span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}
                </div>
                <div class="event-detail">
                    <span>📍</span> ${event.event_location}
                </div>
                <div class="event-detail">
                    <span>🎫</span> ${event.total_slots} slots available
                </div>
            </div>
            <div class="event-actions">
                <button class="btn-secondary" onclick="bookEventHandler('${event.event_id}')">
                    Book Now
                </button>
            </div>
        </div>
    `).join('');
}

function renderMyBookings() {
    const bookingsGrid = document.getElementById('bookingsGrid');
    
    if (userBookings.length === 0) {
        bookingsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <h3>No Bookings Yet</h3>
                <p>Book some events to see them here!</p>
            </div>
        `;
        return;
    }

    bookingsGrid.innerHTML = userBookings.map(booking => `
        <div class="event-card">
            <div class="event-title">${booking.event_title}</div>
            <div class="event-description">${booking.event_description}</div>
            <div class="event-details">
                <div class="event-detail">
                    <span>📅</span> ${formatDate(booking.event_date)}
                </div>
                <div class="event-detail">
                    <span>⏰</span> ${formatTime(booking.event_start_time)} - ${formatTime(booking.event_end_time)}
                </div>
                <div class="event-detail">
                    <span>📍</span> ${booking.event_location}
                </div>
                <div class="event-detail">
                    <span>🎫</span> Booking ID: ${booking.booking_id}
                </div>
                <div class="event-detail">
                    <span>✅</span> Booked on ${new Date(booking.booking_date).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

function renderAdminEvents() {
    const eventsGrid = document.getElementById('adminEventsGrid');
    
    if (events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path>
                </svg>
                <h3>No Events Created</h3>
                <p>Create your first event to get started!</p>
            </div>
        `;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail">
                    <span>📅</span> ${formatDate(event.event_date)}
                </div>
                <div class="event-detail">
                    <span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}
                </div>
                <div class="event-detail">
                    <span>📍</span> ${event.event_location}
                </div>
                <div class="event-detail">
                    <span>🎫</span> ${event.total_slots} slots total
                </div>
            </div>
        </div>
    `).join('');
}

function renderManageEvents() {
    const eventsGrid = document.getElementById('manageEventsGrid');
    
    if (events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path>
                </svg>
                <h3>No Events to Manage</h3>
                <p>Create some events first!</p>
            </div>
        `;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail">
                    <span>📅</span> ${formatDate(event.event_date)}
                </div>
                <div class="event-detail">
                    <span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}
                </div>
                <div class="event-detail">
                    <span>📍</span> ${event.event_location}
                </div>
                <div class="event-detail">
                    <span>🎫</span> ${event.total_slots} slots total
                </div>
            </div>
            <div class="event-actions">
                <button class="btn-secondary" onclick="editEventHandler('${event.event_id}')">
                    Edit
                </button>
                <button class="btn-danger" onclick="deleteEventHandler('${event.event_id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Event handlers
async function bookEventHandler(eventId) {
    try {
        await bookEvent(eventId);
        alert('Event booked successfully!');
        renderEvents();
        renderMyBookings();
    } catch (error) {
        alert('Failed to book event: ' + error.message);
    }
}

function editEventHandler(eventId) {
    alert('Edit functionality would be implemented here');
}

function deleteEventHandler(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        // You'll need to add delete endpoint to your proto files
        alert('Delete functionality needs to be added to proto files');
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
    loginBtn.innerHTML = '<span>⏳</span> Signing In...';
    
    try {
        await login(username, password);
    } catch (error) {
        showError('loginError', error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>🔑</span> Sign In';
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
    signupBtn.innerHTML = '<span>⏳</span> Creating Account...';
    
    try {
        await register(userData);
        alert('Account created successfully! Please sign in.');
        showLogin();
        document.getElementById('signupForm').reset();
    } catch (error) {
        showError('signupError', error.message || 'Failed to create account');
    } finally {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span>👤</span> Create Account';
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
    createBtn.innerHTML = '<span>⏳</span> Creating Event...';
    
    try {
        await createEvent(eventData);
        showSuccess('createEventSuccess', 'Event created successfully!');
        document.getElementById('createEventForm').reset();
        renderEvents();
    } catch (error) {
        showError('createEventError', error.message || 'Failed to create event');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<span>✨</span> Create Event';
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date for event creation to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eventDate').setAttribute('min', today);
    
    // Don't load events initially since user isn't logged in
    console.log('Application initialized');
});