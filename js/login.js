// Setup password toggle
document.addEventListener('DOMContentLoaded', function() {
    setupPasswordToggle();
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Sign in user
        await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Redirect to home page after successful login
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    }
}); 