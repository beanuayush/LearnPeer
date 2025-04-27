// DOM Elements
const coursesGrid = document.querySelector('.courses-grid');
const courseCardTemplate = document.getElementById('courseCardTemplate');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadBookedSessions(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Load booked sessions
async function loadBookedSessions(userId) {
    try {
        // Show loading state
        coursesGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your sessions...</span>
            </div>
        `;

        const bookingsSnapshot = await firebase.firestore()
            .collection('bookings')
            .where('studentId', '==', userId)
            .where('status', 'in', ['confirmed', 'completed'])
            .orderBy('date', 'asc')
            .get()
            .catch(error => {
                if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
                    // If index is not ready, try without ordering
                    return firebase.firestore()
                        .collection('bookings')
                        .where('studentId', '==', userId)
                        .where('status', 'in', ['confirmed', 'completed'])
                        .get();
                }
                throw error;
            });

        // Clear loading spinner
        coursesGrid.innerHTML = '';

        if (bookingsSnapshot.empty) {
            showEmptyState();
            return;
        }

        // Process each booking
        const bookings = bookingsSnapshot.docs;
        for (const booking of bookings) {
            const bookingData = booking.data();
            
            // Get teacher details
            const teacherDoc = await firebase.firestore()
                .collection('users')
                .doc(bookingData.teacherId)
                .get();
            
            const teacherData = teacherDoc.data();
            
            // Create and display the course card
            createCourseCard(booking.id, {
                ...bookingData,
                teacherName: teacherData.fullName
            });
        }
    } catch (error) {
        console.error('Error loading booked sessions:', error);
        showError('Failed to load your sessions. Please try again later.');
    }
}

// Create course card
function createCourseCard(bookingId, booking) {
    const card = courseCardTemplate.content.cloneNode(true);
    
    // Set course information
    card.querySelector('.subject-name').textContent = booking.subject;
    card.querySelector('.teacher-name').textContent = `Teacher: ${booking.teacherName}`;
    
    // Format and set date
    const sessionDate = new Date(booking.date);
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Format time if available
    let displayTime = '';
    if (booking.time) {
        const [hours, minutes] = booking.time.split(':');
        const timeDate = new Date();
        timeDate.setHours(hours);
        timeDate.setMinutes(minutes);
        displayTime = timeDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    card.querySelector('.date-display').textContent = displayTime ? 
        `${formattedDate} at ${displayTime}` : 
        formattedDate;
    
    // Set duration and amount
    card.querySelector('.duration-display').textContent = `${booking.duration} hour${booking.duration === 1 ? '' : 's'}`;
    card.querySelector('.amount-display').textContent = `${booking.totalAmount}`;
    
    // Get buttons
    const startButton = card.querySelector('.btn-start-session');
    const chatButton = card.querySelector('.btn-chat-teacher');
    const completeButton = card.querySelector('.btn-mark-complete');
    
    // Add event listeners to buttons
    startButton.addEventListener('click', () => startSession(bookingId, booking));
    chatButton.addEventListener('click', () => startChat(booking.teacherId));
    completeButton.addEventListener('click', () => markSessionComplete(bookingId));

    if (booking.status === 'completed') {
        // If session is completed, hide action buttons and show completed status
        startButton.classList.add('hidden');
        completeButton.classList.add('hidden');
        const statusElement = document.createElement('div');
        statusElement.className = 'session-status completed';
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        card.querySelector('.course-actions').prepend(statusElement);
    } else {
        // For non-completed sessions, show both Join Session and Mark as Completed buttons
        completeButton.classList.remove('hidden');
    }
    
    // Add the card to the grid
    coursesGrid.appendChild(card);
}

// Mark session as completed
async function markSessionComplete(bookingId) {
    try {
        if (confirm('Are you sure you want to mark this session as completed?')) {
            const bookingRef = firebase.firestore().collection('bookings').doc(bookingId);
            
            await bookingRef.update({
                status: 'completed',
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                completedBy: firebase.auth().currentUser.uid
            });

            // Refresh the courses display
            const user = firebase.auth().currentUser;
            if (user) {
                loadBookedSessions(user.uid);
            }

            alert('Session marked as completed successfully!');
        }
    } catch (error) {
        console.error('Error marking session as completed:', error);
        alert('Failed to mark session as completed. Please try again.');
    }
}

// Show empty state
function showEmptyState() {
    coursesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-book-open"></i>
            <h2>No Sessions Booked Yet</h2>
            <p>Start learning by booking sessions with our teachers!</p>
            <a href="discover.html" class="btn-discover">
                Discover Teachers
            </a>
        </div>
    `;
}

// Start session
async function startSession(bookingId, booking) {
    try {
        // Redirect to the session page immediately
        window.location.href = `session.html?id=${bookingId}`;
    } catch (error) {
        console.error('Error starting session:', error);
        alert('There was an error starting the session. Please try again.');
    }
}

// Start chat with teacher
function startChat(teacherId) {
    window.location.href = `chat.html?teacherId=${teacherId}`;
}

// Show error message
function showError(message) {
    coursesGrid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
            <button onclick="window.location.reload()" class="btn-retry">
                Try Again
            </button>
        </div>
    `;
} 