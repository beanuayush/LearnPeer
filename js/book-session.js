// DOM Elements
const sessionDateInput = document.getElementById('sessionDate');
const sessionDurationSelect = document.getElementById('sessionDuration');
const teacherNameDisplay = document.querySelector('.teacher-name-display');
const subjectDisplay = document.querySelector('.subject-display');
const hourlyRateDisplay = document.querySelector('.hourly-rate-display');
const durationDisplay = document.querySelector('.duration-display');
const totalAmountDisplay = document.querySelector('.total-amount-display');
const confirmButton = document.getElementById('confirmBooking');
const cardNumberInput = document.getElementById('cardNumber');
const expiryDateInput = document.getElementById('expiryDate');
const cvvInput = document.getElementById('cvv');

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const teacherId = urlParams.get('teacherId');
const subject = urlParams.get('subject');
const hourlyRate = parseFloat(urlParams.get('rate'));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    sessionDateInput.min = today;
    
    // Load teacher details
    loadTeacherDetails();
    
    // Setup event listeners
    setupEventListeners();
});

// Load teacher details
async function loadTeacherDetails() {
    try {
        const teacherDoc = await firebase.firestore()
            .collection('users')
            .doc(teacherId)
            .get();
        
        const teacherData = teacherDoc.data();
        teacherNameDisplay.textContent = `Teacher: ${teacherData.fullName}`;
        subjectDisplay.textContent = `Subject: ${subject}`;
        hourlyRateDisplay.textContent = `₹${hourlyRate}`;
        
        // Calculate initial total
        updateTotalAmount();
    } catch (error) {
        console.error('Error loading teacher details:', error);
        showError('Failed to load teacher details. Please try again.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Update total amount when duration changes
    sessionDurationSelect.addEventListener('change', updateTotalAmount);
    
    // Format card number
    cardNumberInput.addEventListener('input', formatCardNumber);
    
    // Format expiry date
    expiryDateInput.addEventListener('input', formatExpiryDate);
    
    // Allow only numbers in CVV
    cvvInput.addEventListener('input', formatCVV);
    
    // Handle booking confirmation
    confirmButton.addEventListener('click', handleBookingConfirmation);
}

// Update total amount
function updateTotalAmount() {
    const duration = parseFloat(sessionDurationSelect.value);
    const total = hourlyRate * duration;
    
    durationDisplay.textContent = `${duration} hour${duration === 1 ? '' : 's'}`;
    totalAmountDisplay.textContent = `₹${total}`;
}

// Format card number with spaces
function formatCardNumber(e) {
    let value = e.target.value.replace(/\s/g, '');
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    e.target.value = value;
}

// Format expiry date (MM/YY)
function formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    e.target.value = value;
}

// Format CVV (numbers only)
function formatCVV(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
}

// Handle booking confirmation
async function handleBookingConfirmation() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }
    
    const duration = parseFloat(sessionDurationSelect.value);
    const totalAmount = hourlyRate * duration;
    
    try {
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Get the selected date and set the time to a reasonable hour (e.g., 10 AM)
        const selectedDate = new Date(sessionDateInput.value);
        const sessionTime = '10:00'; // Default to 10 AM
        
        // Add booking to Firestore
        const bookingData = {
            teacherId: teacherId,
            studentId: firebase.auth().currentUser.uid,
            subject: subject,
            date: sessionDateInput.value, // Store date as YYYY-MM-DD
            time: sessionTime, // Store time separately
            duration: duration,
            hourlyRate: hourlyRate,
            totalAmount: totalAmount,
            status: 'confirmed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore().collection('bookings').add(bookingData);
        
        // Show success message and redirect
        alert('Booking confirmed successfully! You will be redirected to your courses.');
        window.location.href = 'my-courses.html';
        
    } catch (error) {
        console.error('Error processing booking:', error);
        showError('Failed to process booking. Please try again.');
        confirmButton.disabled = false;
        confirmButton.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Booking';
    }
}

// Validate inputs
function validateInputs() {
    if (!sessionDateInput.value) {
        showError('Please select a session date');
        return false;
    }
    
    // Skip payment validation temporarily
    return true;
}

// Show error message
function showError(message) {
    alert(message);
} 