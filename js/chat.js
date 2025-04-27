// DOM Elements
const chatContacts = document.getElementById('chatContacts');
const chatMessages = document.getElementById('chatMessages');
const chatHeader = document.getElementById('chatHeader');
const chatInput = document.getElementById('chatInput');
const messageForm = document.getElementById('messageForm');
const messageText = document.getElementById('messageText');

// Current chat state
let currentUser = null;
let currentChat = null;
let messagesListener = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadContacts();
            
            // Check if there's a teacherId in URL params
            const urlParams = new URLSearchParams(window.location.search);
            const teacherId = urlParams.get('teacherId');
            if (teacherId) {
                openChat(teacherId);
            }
        } else {
            window.location.href = 'login.html';
        }
    });
});

// Load contacts
async function loadContacts() {
    try {
        // Get all chats where the current user is involved
        const chatsSnapshot = await firebase.firestore()
            .collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .get();

        if (chatsSnapshot.empty) {
            showEmptyContacts();
            return;
        }

        // Clear contacts
        chatContacts.innerHTML = '';
        
        // Process each chat
        for (const chat of chatsSnapshot.docs) {
            const chatData = chat.data();
            
            // Get the other participant's ID
            const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
            
            // Get other user's details
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(otherUserId)
                .get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                createContactElement(chat.id, otherUserId, userData);
            }
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
        showError('Failed to load contacts. Please try again later.');
    }
}

// Create contact element
function createContactElement(chatId, userId, userData) {
    const contact = document.createElement('div');
    contact.className = 'chat-contact';
    contact.innerHTML = `
        <div class="contact-info">
            <h3>${userData.fullName}</h3>
            <p>${userData.role === 'teacher' ? 'Teacher' : 'Student'}</p>
        </div>
    `;
    
    contact.addEventListener('click', () => openChat(userId));
    chatContacts.appendChild(contact);
}

// Open chat
async function openChat(userId) {
    try {
        // Get or create chat document
        const chatQuery = await firebase.firestore()
            .collection('chats')
            .where('participants', 'in', [
                [currentUser.uid, userId],
                [userId, currentUser.uid]
            ])
            .get();

        let chatId;
        if (chatQuery.empty) {
            // Create new chat
            const chatRef = await firebase.firestore()
                .collection('chats')
                .add({
                    participants: [currentUser.uid, userId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            chatId = chatRef.id;
        } else {
            chatId = chatQuery.docs[0].id;
        }

        // Get other user's details
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        
        const userData = userDoc.data();

        // Update header
        chatHeader.innerHTML = `
            <h2>Chat with ${userData.fullName}</h2>
            <p>${userData.role === 'teacher' ? 'Teacher' : 'Student'}</p>
        `;

        // Show chat input
        chatInput.style.display = 'flex';

        // Clear messages
        chatMessages.innerHTML = '';

        // Update current chat
        currentChat = {
            id: chatId,
            otherUser: {
                id: userId,
                ...userData
            }
        };

        // Load and listen to messages
        loadMessages();
    } catch (error) {
        console.error('Error opening chat:', error);
        showError('Failed to open chat. Please try again later.');
    }
}

// Load messages
function loadMessages() {
    // Remove previous listener if exists
    if (messagesListener) {
        messagesListener();
    }

    // Listen to messages
    messagesListener = firebase.firestore()
        .collection('chats')
        .doc(currentChat.id)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    displayMessage(message);
                }
            });
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
}

// Display message
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    const timestamp = message.timestamp ? message.timestamp.toDate() : new Date();
    const time = timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit'
    });
    
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${message.text}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = messageText.value.trim();
    if (!text || !currentChat) return;
    
    try {
        // Clear input
        messageText.value = '';
        
        // Add message to Firestore
        await firebase.firestore()
            .collection('chats')
            .doc(currentChat.id)
            .collection('messages')
            .add({
                text,
                senderId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message. Please try again.');
    }
});

// Show empty contacts
function showEmptyContacts() {
    chatContacts.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>No conversations yet</p>
        </div>
    `;
}

// Show error
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
    
    // Show error in appropriate container
    if (currentChat) {
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        chatContacts.innerHTML = '';
        chatContacts.appendChild(errorElement);
    }
} 