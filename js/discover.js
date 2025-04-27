// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const maxPriceInput = document.getElementById('maxPrice');
const applyFiltersButton = document.getElementById('applyFilters');
const teachersGrid = document.querySelector('.teachers-grid');
const teacherModal = document.getElementById('teacherModal');
const closeModal = document.querySelector('.close-modal');
const teacherCardTemplate = document.getElementById('teacherCardTemplate');

// State
let teachers = [];
let filteredTeachers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization...');
    loadTeachers();
    setupEventListeners();
});

// Load teachers from Firestore
async function loadTeachers() {
    try {
        console.log('Starting to load teachers...');
        const teachersSnapshot = await firebase.firestore()
            .collection('teachingOffers')
            .where('status', '==', 'active')
            .get();

        console.log('Teachers snapshot:', teachersSnapshot.size, 'documents found');
        
        teachers = teachersSnapshot.docs.map(doc => {
            const data = {
                id: doc.id,
                ...doc.data()
            };
            console.log('Loaded teacher:', data);
            return data;
        });

        console.log('Total teachers loaded:', teachers.length);
        displayTeachers(teachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
        showError('Failed to load teachers. Please try again later.');
    }
}

// Display teachers in the grid
function displayTeachers(teachersToDisplay) {
    teachersGrid.innerHTML = '';
    
    if (teachersToDisplay.length === 0) {
        teachersGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No teachers found matching your criteria</p>
            </div>
        `;
        return;
    }

    teachersToDisplay.forEach(teacher => {
        const card = createTeacherCard(teacher);
        teachersGrid.appendChild(card);
    });
}

// Create a teacher card element
function createTeacherCard(teacher) {
    const card = teacherCardTemplate.content.cloneNode(true);
    
    // Set teacher information
    card.querySelector('.teacher-name').textContent = teacher.teacherName || 'Anonymous Teacher';
    card.querySelector('.teacher-subject').textContent = teacher.subject;
    card.querySelector('.topics-preview').textContent = Array.isArray(teacher.topics) ? teacher.topics.join(', ') : teacher.topics;
    card.querySelector('.rate-amount').textContent = teacher.hourlyRate;
    
    // Add click event to view details button
    const viewDetailsButton = card.querySelector('.btn-view-details');
    viewDetailsButton.addEventListener('click', () => showTeacherDetails(teacher));
    
    return card;
}

// Show teacher details in modal
function showTeacherDetails(teacher) {
    const teacherDetails = document.querySelector('.teacher-details');
    const modalActions = document.querySelector('.modal-actions');
    
    teacherDetails.innerHTML = `
        <h2>${teacher.teacherName || 'Anonymous Teacher'}</h2>
        <div class="detail-section">
            <h3>Subject</h3>
            <p>${teacher.subject}</p>
        </div>
        <div class="detail-section">
            <h3>Topics Covered</h3>
            <p>${Array.isArray(teacher.topics) ? teacher.topics.join(', ') : teacher.topics}</p>
        </div>
        ${teacher.experience ? `
        <div class="detail-section">
            <h3>Teaching Experience</h3>
            <p>${teacher.experience}</p>
        </div>
        ` : ''}
        <div class="detail-section">
            <h3>Hourly Rate</h3>
            <p><i class="fas fa-rupee-sign"></i> ${teacher.hourlyRate}/hour</p>
        </div>
    `;
    
    // Update chat button
    const chatButton = modalActions.querySelector('.btn-chat');
    if (chatButton) {
        chatButton.onclick = () => startChat(teacher);
    }

    // Update book button
    const bookButton = modalActions.querySelector('.btn-book');
    if (bookButton) {
        bookButton.onclick = () => bookSession(teacher);
    }
    
    // Show modal
    teacherModal.classList.remove('hidden');
}

// Filter teachers based on search and price
function filterTeachers() {
    const searchTerm = searchInput.value.toLowerCase();
    const maxPrice = maxPriceInput.value ? parseInt(maxPriceInput.value) : Infinity;
    
    filteredTeachers = teachers.filter(teacher => {
        const matchesSearch = 
            teacher.subject.toLowerCase().includes(searchTerm) ||
            (Array.isArray(teacher.topics) ? 
                teacher.topics.some(topic => topic.toLowerCase().includes(searchTerm)) :
                teacher.topics.toLowerCase().includes(searchTerm));
        
        const matchesPrice = teacher.hourlyRate <= maxPrice;
        
        return matchesSearch && matchesPrice;
    });
    
    displayTeachers(filteredTeachers);
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', filterTeachers);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') filterTeachers();
    });
    
    // Filter functionality
    applyFiltersButton.addEventListener('click', filterTeachers);
    
    // Modal functionality
    closeModal.addEventListener('click', () => {
        teacherModal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === teacherModal) {
            teacherModal.classList.add('hidden');
        }
    });
    
    // Prevent modal close when clicking inside modal content
    document.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Show error message
function showError(message) {
    teachersGrid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Start chat with teacher
function startChat(teacher) {
    if (!firebase.auth().currentUser) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    
    // Redirect to chat page with teacher ID
    window.location.href = `chat.html?teacherId=${teacher.teacherId}`;
}

// Book session with teacher
function bookSession(teacher) {
    if (!firebase.auth().currentUser) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    
    // Redirect to booking page with teacher information
    window.location.href = `book-session.html?teacherId=${teacher.teacherId}&subject=${encodeURIComponent(teacher.subject)}&rate=${teacher.hourlyRate}`;
} 