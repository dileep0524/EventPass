// --- Configuration ---
const API_BASE_URL = 'http://localhost:8080';

// --- Global State ---
let currentUser = null; // Stores { username, role } of the logged-in user
let currentUserType = 'customer'; // Tracks 'customer' or 'admin' from UI selection before login
let events = []; // Holds the list of all events
let userBookings = []; // Holds events booked by the current customer

// --- API Helper ---

/**
 * Generic API call function.
 * @param {string} endpoint - The API endpoint (e.g., '/v1/users/login').
 * @param {string} [method='GET'] - HTTP method.
 * @param {object} [body=null] - Request body for POST/PUT requests.
 * @returns {Promise<object>} The JSON response from the API.
 * @throws {Error} If the API call fails or returns an error status.
 */
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
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
}

// --- Utility Functions ---

/**
 * Removes the 'hidden' class from an element.
 * @param {string} id - The ID of the HTML element.
 */
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

/**
 * Adds the 'hidden' class to an element.
 * @param {string} id - The ID of the HTML element.
 */
function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

/**
 * Displays an error message in a specified element.
 * @param {string} elementId - The ID of the HTML element to display the error in.
 * @param {string} message - The error message to display.
 */
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

/**
 * Hides an error message element.
 * @param {string} elementId - The ID of the HTML error element.
 */
function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

/**
 * Displays a success message in a specified element.
 * @param {string} elementId - The ID of the HTML element to display the success message in.
 * @param {string} message - The success message to display.
 */
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

/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - ISO date string.
 * @returns {string} Formatted date (e.g., "Monday, January 1, 2023").
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formats a time string into a more readable format.
 * @param {string} timeString - Time string (e.g., "14:00:00").
 * @returns {string} Formatted time (e.g., "02:00 PM").
 */
function formatTime(timeString) {
    // Handles potential full datetime strings by ensuring only time part is used
    const timePart = timeString.includes('T') ? timeString.split('T')[1].split('.')[0] : timeString;
    return new Date(`2000-01-01T${timePart}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// --- User Interaction Functions ---

/**
 * Sets the current user type based on UI selection (customer/admin).
 * Updates button styles to reflect the active type.
 * @param {string} type - The user type ('customer' or 'admin').
 * @param {Event} event - The click event from the user type button.
 */
function setUserType(type, event) {
    currentUserType = type;
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback if event or event.target is not available (e.g. initial setup)
        const buttonToActivate = Array.from(document.querySelectorAll('.user-type-btn')).find(btn => btn.textContent.toLowerCase().includes(type));
        if (buttonToActivate) buttonToActivate.classList.add('active');
    }
}

// --- API Functions ---

/**
 * Registers a new user.
 * @param {object} userData - User registration data.
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} userData.firstName
 * @param {string} userData.lastName
 * @param {string} userData.username
 * @param {string} userData.phone
 * @returns {Promise<object>} API response.
 * @throws {Error} If registration fails.
 */
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
        console.error('Registration error:', error.message);
        throw error;
    }
}

/**
 * Logs in a user.
 * Sets `currentUser` and navigates to the appropriate dashboard on success.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} API response.
 * @throws {Error} If login fails.
 */
async function login(username, password) {
    try {
        // The user_id field in the request seems optional or determined server-side for login.
        // Sending an empty string if not explicitly required by backend for login action.
        const response = await apiCall('/v1/users/login', 'POST', {
            username: username,
            password: password,
            user_id: "" // Assuming backend handles user_id lookup or doesn't need it for login
        });
        
        // Determine role based on currentUserType selected in UI and username for admin
        // This logic might need refinement based on actual backend authentication response
        if (currentUserType === 'admin' && username === 'admin') { // Simple admin check
            currentUser = { username: username, role: 'admin' };
            document.getElementById('welcomeAdmin').textContent = `Welcome, ${username}`;
            hideElement('loginPage');
            showElement('adminDashboard');
            showAdminDashboard(); // Initial view for admin dashboard
        } else {
            // All other users are customers for now
            currentUser = { username: username, role: 'customer' };
            currentUserType = 'customer'; // Ensure currentUserType is customer
            document.getElementById('welcomeCustomer').textContent = `Welcome, ${username}`;
            hideElement('loginPage');
            showElement('customerDashboard');
            showCustomerDashboard(); // Initial view for customer dashboard
        }
        
        await loadEvents(); // Load events relevant to the user
        return { success: true, data: response };
    } catch (error) {
        console.error('Login error:', error.message);
        throw new Error('Invalid credentials or server error. Please try again.');
    }
}

/**
 * Creates a new event (admin only).
 * @param {object} eventData - Event details.
 * @returns {Promise<object>} API response.
 * @throws {Error} If event creation fails.
 */
async function createEvent(eventData) {
    try {
        const response = await apiCall('/v1/event/create', 'POST', {
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            event_location: eventData.event_location,
            event_date: eventData.event_date,
            event_start_time: eventData.event_start_time,
            event_end_time: eventData.event_end_time,
            created_by: eventData.created_by, // Should be current admin user's ID/username
            total_slots: eventData.total_slots
        });
        
        await loadEvents(); // Refresh events list
        return { success: true, data: response };
    } catch (error) {
        console.error('Create event error:', error.message);
        throw error;
    }
}

/**
 * Loads all available events from the API.
 * Updates the global `events` array and re-renders event displays.
 */
async function loadEvents() {
    try {
        const response = await apiCall('/v1/events?page=1&limit=100'); // Fetch a large number of events
        events = response.events || []; // Ensure events is an array
        renderEvents(); // Update UI based on current user role
    } catch (error) {
        console.error('Load events error:', error.message);
        events = []; // Fallback to empty array on error
        renderEvents(); // Still try to render (will show empty state)
    }
}

/**
 * Retrieves details for a specific event.
 * @param {string} eventId
 * @returns {Promise<object>} Event details.
 * @throws {Error} If fetching fails.
 */
async function getEventDetails(eventId) {
    try {
        const response = await apiCall(`/v1/events/${eventId}`);
        return response;
    } catch (error) {
        console.error('Get event details error:', error.message);
        throw error;
    }
}

/**
 * Books an event for the current user.
 * @param {string} eventId - The ID of the event to book.
 * @returns {Promise<object>} API response.
 * @throws {Error} If booking fails.
 */
async function bookEvent(eventId) {
    if (!currentUser || !currentUser.username) {
        throw new Error("User not logged in.");
    }
    try {
        // Assuming the backend uses the authenticated user context for user_id
        // If user_id needs to be sent explicitly:
        // const response = await apiCall(`/v1/events/${eventId}/book`, 'POST', { user_id: currentUser.username });
        const response = await apiCall(`/v1/events/${eventId}/book`, 'POST', {
             user_id: currentUser.username // Or actual user ID from currentUser object if available
        });
        
        // Optimistically update local bookings (or re-fetch if necessary)
        const event = events.find(e => e.event_id === eventId);
        if (event) {
            userBookings.push({
                ...event, // Copy event details
                booking_date: new Date().toISOString(), // Add booking specific info
                booking_id: response.booking_id || Math.random().toString(36).substr(2, 9) // Use booking_id from response or generate temp
            });
        }
        
        await loadEvents(); // Refresh events to update available slots and potentially user bookings
        return { success: true, data: response };
    } catch (error) {
        console.error('Book event error:', error.message);
        throw error;
    }
}

// --- UI Update Functions (Navigation and Page Switching) ---

/** Shows the login page, hides signup. */
function showLogin() {
    hideElement('signupPage');
    showElement('loginPage');
    hideError('loginError'); // Clear previous errors
}

/** Shows the signup page, hides login. */
function showSignup() {
    hideElement('loginPage');
    showElement('signupPage');
    hideError('signupError'); // Clear previous errors
}

/** Shows the main customer dashboard view. */
function showCustomerDashboard() {
    hideElement('myBookingsContent');
    hideElement('favoritesContent');
    showElement('customerDashboardContent');
    updateNavActive('customerDashboard', 0); // Set "Events" as active
    renderCustomerEvents();
}

/** Shows the "My Bookings" view for customers. */
function showMyBookings() {
    hideElement('customerDashboardContent');
    hideElement('favoritesContent');
    showElement('myBookingsContent');
    updateNavActive('customerDashboard', 1); // Set "My Bookings" as active
    renderMyBookings();
}

/** Shows the main admin dashboard view. */
function showAdminDashboard() {
    hideElement('createEventContent');
    hideElement('manageEventsContent');
    hideElement('analyticsContent');
    showElement('adminDashboardContent');
    updateNavActive('adminDashboard', 0); // Set "Dashboard" (event list) as active
    renderAdminEvents();
}

/** Shows the "Create Event" form for admins. */
function showCreateEvent() {
    hideElement('adminDashboardContent');
    hideElement('manageEventsContent');
    hideElement('analyticsContent');
    showElement('createEventContent');
    updateNavActive('adminDashboard', 1); // Set "Create Event" as active
    hideError('createEventError'); // Clear previous errors
    hideElement('createEventSuccess'); // Hide previous success message
}

/** Shows the "Manage Events" view for admins. */
function showManageEvents() {
    hideElement('adminDashboardContent');
    hideElement('createEventContent');
    hideElement('analyticsContent');
    showElement('manageEventsContent');
    updateNavActive('adminDashboard', 2); // Set "Manage Events" as active
    renderManageEvents();
}

/**
 * Updates the active state for navigation items within a dashboard.
 * @param {string} dashboardId - The ID of the dashboard container (e.g., 'customerDashboard', 'adminDashboard').
 * @param {number} index - The index of the nav item to activate.
 */
function updateNavActive(dashboardId, index) {
    const navItems = document.querySelectorAll(`#${dashboardId} .nav-item`);
    navItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/** Logs out the current user and returns to the login page. */
function logout() {
    currentUser = null;
    events = [];
    userBookings = [];
    // Hide all dashboard sections
    hideElement('customerDashboard');
    hideElement('adminDashboard');
    // Show login page
    showElement('loginPage');
    
    // Clear sensitive form data
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    if(document.getElementById('createEventForm')) { // createEventForm might not always exist
        document.getElementById('createEventForm').reset();
    }
    console.log('User logged out.');
}

// --- UI Rendering Functions ---

/**
 * Main render function dispatcher. Calls the appropriate render function
 * based on the current user's role.
 */
function renderEvents() {
    if (currentUser?.role === 'customer') {
        renderCustomerEvents();
    } else if (currentUser?.role === 'admin') {
        // Admin might see a different view of events, or manage events view
        // For now, let's assume admin also sees a list of events on their main dashboard
        renderAdminEvents(); // Or specific admin view if showAdminDashboard manages it
    }
}

/** Renders events for the customer view. */
function renderCustomerEvents() {
    const eventsGrid = document.getElementById('customerEventsGrid');
    if (!eventsGrid) return; // Guard clause

    if (!events || events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path></svg>
                <h3>No Events Available</h3>
                <p>Check back later for exciting events!</p>
            </div>`;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <article class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail"><span>📅</span> ${formatDate(event.event_date)}</div>
                <div class="event-detail"><span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}</div>
                <div class="event-detail"><span>📍</span> ${event.event_location}</div>
                <div class="event-detail"><span>🎫</span> ${event.total_slots - (event.booked_slots || 0)} slots available</div>
            </div>
            <div class="event-actions">
                <button class="btn-secondary" onclick="bookEventHandler(this, '${event.event_id}')" ${ (event.total_slots - (event.booked_slots || 0)) <= 0 ? 'disabled' : ''}>
                    ${ (event.total_slots - (event.booked_slots || 0)) <= 0 ? 'Sold Out' : 'Book Now'}
                </button>
            </div>
        </article>
    `).join('');
}

/** Renders booked events for the customer. */
function renderMyBookings() {
    const bookingsGrid = document.getElementById('bookingsGrid');
    if (!bookingsGrid) return; // Guard clause

    if (!userBookings || userBookings.length === 0) {
        bookingsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                <h3>No Bookings Yet</h3>
                <p>Book some events to see them here!</p>
            </div>`;
        return;
    }

    bookingsGrid.innerHTML = userBookings.map(booking => `
        <article class="event-card">
            <div class="event-title">${booking.event_title}</div>
            <div class="event-description">${booking.event_description}</div>
            <div class="event-details">
                <div class="event-detail"><span>📅</span> ${formatDate(booking.event_date)}</div>
                <div class="event-detail"><span>⏰</span> ${formatTime(booking.event_start_time)} - ${formatTime(booking.event_end_time)}</div>
                <div class="event-detail"><span>📍</span> ${booking.event_location}</div>
                <div class="event-detail"><span>🎫</span> Booking ID: ${booking.booking_id}</div>
                <div class="event-detail"><span>✅</span> Booked on ${new Date(booking.booking_date).toLocaleDateString()}</div>
            </div>
            </article>`).join('');
}

/** Renders events for the admin dashboard (overview). */
function renderAdminEvents() {
    const eventsGrid = document.getElementById('adminEventsGrid');
    if (!eventsGrid) return; // Guard clause

    if (!events || events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path></svg>
                <h3>No Events Created</h3>
                <p>Create your first event to get started!</p>
            </div>`;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <article class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail"><span>📅</span> ${formatDate(event.event_date)}</div>
                <div class="event-detail"><span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}</div>
                <div class="event-detail"><span>📍</span> ${event.event_location}</div>
                <div class="event-detail"><span>👥</span> ${event.booked_slots || 0} / ${event.total_slots} booked</div>
            </div>
        </article>`).join('');
}

/** Renders events for the "Manage Events" view (admin). */
function renderManageEvents() {
    const eventsGrid = document.getElementById('manageEventsGrid');
    if (!eventsGrid) return; // Guard clause

    if (!events || events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4l-4 4-4-4V7z"></path></svg>
                <h3>No Events to Manage</h3>
                <p>Create some events first!</p>
            </div>`;
        return;
    }

    eventsGrid.innerHTML = events.map(event => `
        <article class="event-card">
            <div class="event-title">${event.event_title}</div>
            <div class="event-description">${event.event_description}</div>
            <div class="event-details">
                <div class="event-detail"><span>📅</span> ${formatDate(event.event_date)}</div>
                <div class="event-detail"><span>⏰</span> ${formatTime(event.event_start_time)} - ${formatTime(event.event_end_time)}</div>
                <div class="event-detail"><span>📍</span> ${event.event_location}</div>
                <div class="event-detail"><span>👥</span> ${event.booked_slots || 0} / ${event.total_slots} booked</div>
            </div>
            <div class="event-actions">
                <button class="btn-secondary" onclick="editEventHandler('${event.event_id}')">Edit</button>
                <button class="btn-danger" onclick="deleteEventHandler('${event.event_id}')">Delete</button>
            </div>
        </article>`).join('');
}

// --- Event Handlers ---

/**
 * Handles the booking of an event. Updates button state during API call.
 * @param {HTMLButtonElement} buttonElement - The button that was clicked.
 * @param {string} eventId - The ID of the event to book.
 */
async function bookEventHandler(buttonElement, eventId) {
    const originalButtonText = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<span>⏳</span> Booking...';

    try {
        await bookEvent(eventId);
        alert('Event booked successfully!');
        buttonElement.innerHTML = '<span>✅</span> Booked!';
        // Button remains disabled as it's booked
        renderEvents(); // Re-render to update slot counts, etc.
        if (currentUser?.role === 'customer' && typeof renderMyBookings === 'function') {
            renderMyBookings(); // Update "My Bookings" view if applicable
        }
    } catch (error) {
        alert('Failed to book event: ' + error.message);
        buttonElement.disabled = false; // Re-enable on error
        buttonElement.innerHTML = originalButtonText; // Restore original text
    }
}

/**
 * Placeholder for handling event editing.
 * @param {string} eventId - The ID of the event to edit.
 */
function editEventHandler(eventId) {
    // In a real app, this would likely open a modal or navigate to an edit form
    alert(`Edit functionality for event ${eventId} would be implemented here.`);
    // Example: Populate a form with getEventDetails(eventId) and then show the form.
}

/**
 * Placeholder for handling event deletion.
 * @param {string} eventId - The ID of the event to delete.
 */
async function deleteEventHandler(eventId) {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        try {
            // const response = await apiCall(`/v1/event/${eventId}/delete`, 'DELETE'); // Assuming a DELETE endpoint
            // alert('Event deleted successfully!');
            // await loadEvents(); // Refresh event lists
            // For now, as endpoint is not specified:
            alert('Delete functionality needs a backend endpoint. Simulating delete for now.');
            // Simulate deletion locally if backend is not ready:
            // events = events.filter(event => event.event_id !== eventId);
            // renderEvents();
            // renderManageEvents();
        } catch (error) {
            // alert('Failed to delete event: ' + error.message);
            console.error("Delete event error:", error);
        }
    }
}

// --- Form Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const loginBtn = document.getElementById('loginBtn');
            const originalBtnText = loginBtn.innerHTML;

            hideError('loginError');
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span>⏳</span> Signing In...';

            try {
                await login(username, password);
            } catch (error) {
                showError('loginError', error.message);
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnText;
            }
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
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
            const originalBtnText = signupBtn.innerHTML;

            hideError('signupError');
            signupBtn.disabled = true;
            signupBtn.innerHTML = '<span>⏳</span> Creating Account...';

            try {
                await register(userData);
                alert('Account created successfully! Please sign in.');
                showLogin(); // Switch to login view
                signupForm.reset(); // Reset signup form
            } catch (error) {
                showError('signupError', error.message || 'Failed to create account. Please try again.');
            } finally {
                signupBtn.disabled = false;
                signupBtn.innerHTML = originalBtnText;
            }
        });
    }

    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const eventData = {
                event_title: document.getElementById('eventTitle').value,
                event_description: document.getElementById('eventDescription').value,
                event_location: document.getElementById('eventLocation').value,
                event_date: document.getElementById('eventDate').value,
                event_start_time: document.getElementById('startTime').value,
                event_end_time: document.getElementById('endTime').value,
                total_slots: parseInt(document.getElementById('totalSlots').value),
                created_by: currentUser.username // Assuming admin username is sufficient
            };

            const createBtn = document.getElementById('createEventBtn');
            const originalBtnText = createBtn.innerHTML;

            hideError('createEventError');
            hideElement('createEventSuccess');
            createBtn.disabled = true;
            createBtn.innerHTML = '<span>⏳</span> Creating Event...';

            try {
                await createEvent(eventData);
                showSuccess('createEventSuccess', 'Event created successfully!');
                createEventForm.reset();
                // showAdminDashboard(); // Optionally navigate back to event list
                await loadEvents(); // Refresh admin event list
            } catch (error) {
                showError('createEventError', error.message || 'Failed to create event. Please try again.');
            } finally {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
        });
    }
    
    // --- Initialization ---
    // Set minimum date for event creation to today for relevant date pickers
    const eventDateField = document.getElementById('eventDate');
    if (eventDateField) {
        const today = new Date().toISOString().split('T')[0];
        eventDateField.setAttribute('min', today);
    }
    
    // Initial UI setup: show login page, hide dashboards
    hideElement('customerDashboard');
    hideElement('adminDashboard');
    hideElement('signupPage'); // Start with login page usually
    showElement('loginPage');
    setUserType('customer', null); // Default to customer type selection

    console.log('Application initialized. Please log in or sign up.');
});
