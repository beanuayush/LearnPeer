// Setup password toggle
document.addEventListener('DOMContentLoaded', function() {
    setupPasswordToggle();
});

// Handle signup form submission
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const department = document.getElementById('department').value;

    try {
        // Create user account
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Set display name
        await userCredential.user.updateProfile({
            displayName: fullName
        });
        
        // Add user details to Firestore
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            fullName: fullName,
            email: email,
            department: department,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    }
}); 