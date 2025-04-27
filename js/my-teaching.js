document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User is logged in:', user.uid);
            loadTeachingCourses(user.uid);
            loadBookedSessions(user.uid);
        } else {
            console.log('No user logged in');
            window.location.href = 'index.html';
        }
    });
});

async function loadTeachingCourses(userId) {
    const teachingGrid = document.getElementById('teachingGrid');
    const template = document.getElementById('teachingCardTemplate');
    
    try {
        console.log('Loading courses for user:', userId);
        
        // Get all courses where the current user is the teacher
        const coursesSnapshot = await firebase.firestore()
            .collection('teachingOffers')
            .where('teacherId', '==', userId)
            .get();

        console.log('Courses found:', coursesSnapshot.size);

        if (coursesSnapshot.empty) {
            teachingGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <h2>No Teaching Courses Yet</h2>
                    <p>You haven't created any teaching courses yet. Start sharing your knowledge!</p>
                    <a href="teach.html" class="btn-discover">
                        <i class="fas fa-plus"></i>
                        Create a Course
                    </a>
                </div>
            `;
            return;
        }

        // Clear existing content
        teachingGrid.innerHTML = '';

        // Process each course
        for (const doc of coursesSnapshot.docs) {
            const course = doc.data();
            console.log('Processing course:', course);
            
            const card = template.content.cloneNode(true);

            // Fill in the course details
            card.querySelector('.subject-name').textContent = course.subject || 'No subject';
            
            // Format and display topics
            if (course.topics && course.topics.length > 0) {
                const topicsText = course.topics.map(topic => `• ${topic}`).join('\n');
                card.querySelector('.topics').textContent = topicsText;
            } else {
                card.querySelector('.topics').textContent = 'No topics listed';
            }

            // Add event listener for delete button
            const deleteBtn = card.querySelector('.btn-delete-teaching');
            deleteBtn.addEventListener('click', () => deleteCourse(doc.id));

            teachingGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading teaching courses:', error);
        teachingGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Error Loading Courses</h2>
                <p>There was an error loading your teaching courses. Please try again later.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
    }
}

async function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course? This will also remove all enrollments and cannot be undone.')) {
        try {
            // Delete all enrollments first
            const enrollmentsSnapshot = await firebase.firestore()
                .collection('enrollments')
                .where('courseId', '==', courseId)
                .get();

            const deletePromises = enrollmentsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);

            // Delete the course
            await firebase.firestore()
                .collection('teachingOffers')
                .doc(courseId)
                .delete();

            // Reload the teaching courses
            const user = firebase.auth().currentUser;
            if (user) {
                loadTeachingCourses(user.uid);
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('There was an error deleting the course. Please try again.');
        }
    }
}

async function loadBookedSessions(userId) {
    const sessionsGrid = document.getElementById('sessionsGrid');
    const template = document.getElementById('sessionCardTemplate');

    try {
        // Show loading state
        sessionsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your sessions...</span>
            </div>
        `;

        // Get all sessions (both confirmed and completed) without orderBy
        const bookingsSnapshot = await firebase.firestore()
            .collection('bookings')
            .where('teacherId', '==', userId)
            .where('status', 'in', ['confirmed', 'completed'])
            .get();

        // Clear loading spinner
        sessionsGrid.innerHTML = '';

        if (bookingsSnapshot.empty) {
            sessionsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h2>No Sessions Found</h2>
                    <p>You don't have any booked sessions yet.</p>
                </div>
            `;
            return;
        }

        // Sort the sessions by date manually
        const sessions = bookingsSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
        
        sessions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA; // Sort in descending order (newest first)
        });

        // Process each booking
        for (const booking of sessions) {
            console.log('Processing booking:', booking);
            
            const card = template.content.cloneNode(true);

            // Format date
            const sessionDate = new Date(booking.date);
            const dateStr = sessionDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            // Fill in the booking details
            card.querySelector('.session-subject').textContent = booking.subject || 'Unnamed Course';
            
            // Set status with appropriate styling
            const statusElement = card.querySelector('.session-status');
            if (booking.status === 'completed') {
                statusElement.textContent = 'Completed';
                statusElement.style.backgroundColor = 'var(--success-color)';
            } else {
                statusElement.textContent = 'Upcoming';
                statusElement.style.backgroundColor = 'var(--accent-color)';
            }

            card.querySelector('.session-date').textContent = dateStr;
            card.querySelector('.session-time').textContent = `Duration: ${booking.duration} hour${booking.duration === 1 ? '' : 's'}`;
            
            // Get student name
            const studentDoc = await firebase.firestore()
                .collection('users')
                .doc(booking.studentId)
                .get();
            const studentData = studentDoc.data();
            card.querySelector('.student-count').textContent = studentData.fullName || 'Unknown Student';

            // Add event listeners for buttons
            const joinBtn = card.querySelector('.btn-join-session');
            const cancelBtn = card.querySelector('.btn-cancel-session');

            // Handle button visibility based on session status
            if (booking.status === 'completed') {
                joinBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                
                // Add completion info if available
                if (booking.completedAt) {
                    const completedDate = booking.completedAt.toDate();
                    const completedInfo = document.createElement('p');
                    completedInfo.innerHTML = `<i class="fas fa-check-circle"></i> Completed on ${completedDate.toLocaleDateString()}`;
                    completedInfo.style.color = 'var(--success-color)';
                    card.querySelector('.session-details').appendChild(completedInfo);
                }
            } else {
                joinBtn.addEventListener('click', () => joinSession(booking.id));
                cancelBtn.addEventListener('click', () => cancelSession(booking.id));
            }

            sessionsGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading booked sessions:', error);
        sessionsGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Error Loading Sessions</h2>
                <p>There was an error loading your sessions. Please try again later.</p>
            </div>
        `;
    }
}

async function joinSession(sessionId) {
    try {
        // Redirect to the session page
        window.location.href = `session.html?id=${sessionId}`;
    } catch (error) {
        console.error('Error joining session:', error);
        alert('There was an error joining the session. Please try again.');
    }
}

async function cancelSession(bookingId) {
    if (confirm('Are you sure you want to cancel this session? This cannot be undone.')) {
        try {
            // Update booking status to cancelled
            await firebase.firestore()
                .collection('bookings')
                .doc(bookingId)
                .update({
                    status: 'cancelled',
                    cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                    cancelledBy: 'teacher'
                });

            // Reload the booked sessions
            const user = firebase.auth().currentUser;
            if (user) {
                loadBookedSessions(user.uid);
            }

            alert('Session cancelled successfully.');
        } catch (error) {
            console.error('Error cancelling session:', error);
            alert('There was an error cancelling the session. Please try again.');
        }
    }
}