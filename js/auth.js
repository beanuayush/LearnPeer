// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDEfXGni9l2K4VK3P93DzLtLOjw4PfJp4I",
    authDomain: "learnpeer-fdaba.firebaseapp.com",
    projectId: "learnpeer-fdaba",
    storageBucket: "learnpeer-fdaba.firebasestorage.app",
    messagingSenderId: "915966785254",
    appId: "1:915966785254:web:aadc324b220f1eeb7a6d27"
};

// Initialize Firebase
try {
    console.log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// Set persistence to LOCAL (keeps user logged in even after browser restart)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Auth state observer
firebase.auth().onAuthStateChanged((user) => {
    console.log('Auth state changed in auth.js:', user ? `User logged in: ${user.uid}` : 'No user');
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');

    if (user) {
        // User is signed in
        if (authLinks) {
            authLinks.classList.add('hidden');
        }
        if (userMenu) {
            userMenu.classList.remove('hidden');
        }
        
        // Update UI to show user is logged in
        updateUIForAuthenticatedUser(user);
        
        // Check for unread messages
        checkUnreadMessages(user.uid);
    } else {
        // User is signed out
        if (authLinks) {
            authLinks.classList.remove('hidden');
        }
        if (userMenu) {
            userMenu.classList.add('hidden');
        }
        
        // Update UI to show user is logged out
        updateUIForUnauthenticatedUser();
    }
});

// Update UI for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Get user data from Firestore
    firebase.firestore().collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log('User is logged in:', userData.fullName);
            }
        })
        .catch((error) => {
            console.error('Error getting user data:', error);
        });
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
    console.log('User is logged out');
}

// Check unread messages
function checkUnreadMessages(userId) {
    const notificationBadge = document.querySelector('.notification-badge');
    firebase.firestore()
        .collection('messages')
        .where('to', '==', userId)
        .where('read', '==', false)
        .onSnapshot((snapshot) => {
            const count = snapshot.size;
            if (count > 0 && notificationBadge) {
                notificationBadge.textContent = count;
                notificationBadge.classList.remove('hidden');
            } else if (notificationBadge) {
                notificationBadge.classList.add('hidden');
            }
        });
}

// Toggle password visibility
function setupPasswordToggle() {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
}

// Function to handle logout
function logout() {
    console.log('Logging out...');
    firebase.auth().signOut()
        .then(() => {
            console.log('Logged out successfully');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error logging out:', error);
        });
} 
