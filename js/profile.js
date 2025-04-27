// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
    // Get the profile form
    const profileForm = document.getElementById('profileForm');
    
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Load user profile data
            loadUserProfile(user);
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // Handle form submission
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
});

// Load user profile data
function loadUserProfile(user) {
    const db = firebase.firestore();
    
    // Get user document from Firestore
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Populate form fields
                document.getElementById('fullName').value = userData.fullName || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = userData.phone || '';
                document.getElementById('bio').value = userData.bio || '';
                document.getElementById('upiId').value = userData.upiId || '';
                document.getElementById('subjects').value = userData.subjects ? userData.subjects.join(', ') : '';
            }
        })
        .catch((error) => {
            showError('Error loading profile: ' + error.message);
        });
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const user = firebase.auth().currentUser;
    if (!user) return;

    const db = firebase.firestore();
    const submitButton = document.querySelector('.btn-primary');
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        // Get form values
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            bio: document.getElementById('bio').value.trim(),
            upiId: document.getElementById('upiId').value.trim(),
            subjects: document.getElementById('subjects').value.split(',').map(s => s.trim()).filter(s => s),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validate phone number
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            showError('Please enter a valid 10-digit phone number');
            return;
        }

        // Update profile in Firestore
        await db.collection('users').doc(user.uid).update(formData);
        
        // Show success message with checkmark icon
        showSuccess('<i class="fas fa-check-circle"></i> Profile updated successfully!');
        
        // Reset button state after short delay
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Save Changes';
        }, 1000);
    } catch (error) {
        showError('Error updating profile: ' + error.message);
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save Changes';
    }
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = message;
    
    // Remove any existing success messages
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    const form = document.getElementById('profileForm');
    form.parentNode.insertBefore(successDiv, form);
    
    // Add show class for animation
    setTimeout(() => successDiv.classList.add('show'), 10);
    
    // Remove the message after 3 seconds with fade-out effect
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
    errorDiv.innerHTML = message;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const form = document.getElementById('profileForm');
    form.parentNode.insertBefore(errorDiv, form);
    
    // Add show class for animation
    setTimeout(() => errorDiv.classList.add('show'), 10);
    
    // Remove the message after 3 seconds with fade-out effect
    setTimeout(() => {
        errorDiv.style.transition = 'opacity 0.5s ease-out';
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
} 