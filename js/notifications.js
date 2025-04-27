// Check for new booked sessions
async function checkBookedSessions() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Get all sessions where user is the teacher
        const sessionsSnapshot = await firebase.firestore()
            .collection('bookings')
            .where('teacherId', '==', user.uid)
            .where('status', '==', 'booked')
            .get();

        // Find the teaching link
        const teachingLink = document.querySelector('.teaching-link');
        if (!teachingLink) return;

        if (sessionsSnapshot.empty) {
            // No booked sessions
            teachingLink.classList.remove('has-notification');
        } else {
            // Has booked sessions
            teachingLink.classList.add('has-notification');
        }
    } catch (error) {
        console.error('Error checking booked sessions:', error);
    }
}

// Initialize notifications
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Initial check
            checkBookedSessions();
            
            // Set up real-time listener for new bookings
            const bookingsRef = firebase.firestore()
                .collection('bookings')
                .where('teacherId', '==', user.uid)
                .where('status', '==', 'booked');

            bookingsRef.onSnapshot(() => {
                checkBookedSessions();
            });
        }
    });
}); 