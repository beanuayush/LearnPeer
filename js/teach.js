// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
    const teachForm = document.getElementById('teachForm');
    
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // Handle form submission
    if (teachForm) {
        teachForm.addEventListener('submit', handleTeachSubmit);
    }
});

// Handle teach form submission
async function handleTeachSubmit(e) {
    e.preventDefault();
    
    const user = firebase.auth().currentUser;
    if (!user) return;

    const submitButton = document.querySelector('.btn-submit');
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        // Get user's full name from Firestore
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Get form values
        const formData = {
            subject: document.getElementById('subject').value.trim(),
            topics: document.getElementById('topics').value.trim().split('\n').map(topic => topic.trim()).filter(topic => topic),
            experience: document.getElementById('experience').value.trim(),
            hourlyRate: parseInt(document.getElementById('hourlyRate').value),
            teacherId: user.uid,
            teacherName: userData.fullName || user.displayName || 'Anonymous Teacher',
            teacherEmail: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };

        // Validate hourly rate
        if (formData.hourlyRate < 20) {
            showError('Hourly rate must be at least ₹20');
            return;
        }

        const db = firebase.firestore();
        
        // Add teaching offer to Firestore
        await db.collection('teachingOffers').add(formData);
        
        // Update user's teaching subjects in their profile
        await db.collection('users').doc(user.uid).update({
            teachingSubjects: firebase.firestore.FieldValue.arrayUnion(formData.subject)
        });
        
        // Show success message
        showSuccess('Your teaching offer has been submitted successfully!');
        
        // Reset form
        teachForm.reset();
        
        // Reset button state after short delay
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Start Teaching';
        }, 1000);
        
        // Redirect to my-teaching page after 2 seconds
        setTimeout(() => {
            window.location.href = 'my-teaching.html';
        }, 2000);
    } catch (error) {
        showError('Error submitting teaching offer: ' + error.message);
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Start Teaching';
    }
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
    
    const form = document.getElementById('teachForm');
    form.parentNode.insertBefore(successDiv, form);
    
    // Add show class for animation
    setTimeout(() => successDiv.classList.add('show'), 10);
    
    // Remove the message after delay
    setTimeout(() => {
        successDiv.style.transition = 'opacity 0.5s ease-out';
        successDiv.style.opacity = '0';
        setTimeout(() => successDiv.remove(), 500);
    }, 3000);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + message;
    
    const form = document.getElementById('teachForm');
    form.parentNode.insertBefore(errorDiv, form);
    
    // Add show class for animation
    setTimeout(() => errorDiv.classList.add('show'), 10);
    
    // Remove the message after delay
    setTimeout(() => {
        errorDiv.style.transition = 'opacity 0.5s ease-out';
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
} 