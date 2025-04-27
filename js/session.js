// DOM Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const remoteName = document.getElementById('remoteName');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const endCallBtn = document.getElementById('endCall');
const toggleScreenShareBtn = document.getElementById('toggleScreenShare');

// WebRTC configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

let localStream;
let peerConnection;
let sessionDoc;
let sessionId;
let isTeacher;
let isVideoEnabled = true;
let isAudioEnabled = true;
let isScreenSharing = false;
let screenStream;
let pendingCandidates = [];
let remoteDescriptionSet = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Session page loaded, waiting for auth...');
    
    // Wait for auth state to be ready
    firebase.auth().onAuthStateChanged(async (user) => {
        try {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            
            if (!user) {
                console.log('No user found, redirecting to login');
                window.location.href = 'login.html';
                return;
            }

            // Get session ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            sessionId = urlParams.get('id');
            console.log('Session ID from URL:', sessionId);

            if (!sessionId) {
                console.log('No session ID provided');
                alert('No session ID provided');
                window.location.href = 'index.html';
                return;
            }

            // Get booking details
            console.log('Fetching booking details...');
            const bookingDoc = await firebase.firestore()
                .collection('bookings')
                .doc(sessionId)
                .get();

            if (!bookingDoc.exists) {
                console.log('Booking not found');
                alert('Session not found');
                window.location.href = 'index.html';
                return;
            }

            const booking = bookingDoc.data();
            console.log('Booking data:', booking);
            
            isTeacher = user.uid === booking.teacherId;
            console.log('User role:', isTeacher ? 'Teacher' : 'Student');

            // Verify user is part of this session
            if (user.uid !== booking.teacherId && user.uid !== booking.studentId) {
                console.log('User not authorized for this session');
                alert('You are not authorized to join this session');
                window.location.href = 'index.html';
                return;
            }

            // Get other participant's name
            const otherUserId = isTeacher ? booking.studentId : booking.teacherId;
            console.log('Fetching other participant details:', otherUserId);
            
            const otherUserDoc = await firebase.firestore()
                .collection('users')
                .doc(otherUserId)
                .get();

            if (otherUserDoc.exists) {
                remoteName.textContent = otherUserDoc.data().fullName;
                console.log('Other participant name set:', otherUserDoc.data().fullName);
            }

            // Initialize WebRTC
            console.log('Setting up local stream...');
            await setupLocalStream();
            
            console.log('Setting up peer connection...');
            await setupPeerConnection();

            // Create or join session room
            console.log('Creating/joining session room...');
            sessionDoc = firebase.firestore()
                .collection('sessions')
                .doc(sessionId);

            // Listen for remote ICE candidates
            console.log('Setting up ICE candidate listener...');
            sessionDoc.collection(isTeacher ? 'studentCandidates' : 'teacherCandidates')
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            console.log('Received ICE candidate from Firestore');
                            handleRemoteCandidate(candidate);
                        }
                    });
                });

            // Handle connection based on role
            console.log('Handling connection for', isTeacher ? 'teacher' : 'student');
            if (isTeacher) {
                await handleTeacherConnection();
            } else {
                await handleStudentConnection();
            }

            // Setup controls
            console.log('Setting up controls...');
            setupControls();

        } catch (error) {
            console.error('Error initializing session:', error);
            console.error('Error stack:', error.stack);
            console.error('Error details:', {
                sessionId,
                userId: firebase.auth().currentUser?.uid,
                isTeacher,
                error: error.message
            });
            alert('Failed to initialize session. Please try again. Error: ' + error.message);
        }
    });
});

// Setup local video stream
async function setupLocalStream() {
    try {
        const cameraDisabled = localStorage.getItem('cameraDisabled') === 'true';
        isVideoEnabled = !cameraDisabled;

        localStream = await navigator.mediaDevices.getUserMedia({
            video: isVideoEnabled,
            audio: true
        });

        if (toggleVideoBtn) {
            toggleVideoBtn.innerHTML = isVideoEnabled ? 
                '<i class="fas fa-video"></i>' : 
                '<i class="fas fa-video-slash"></i>';
            toggleVideoBtn.classList.toggle('video-off', !isVideoEnabled);
        }

        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera and/or microphone. Please ensure they are connected and permissions are granted.');
        throw error;
    }
}

// Setup WebRTC peer connection
async function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const candidatesCollection = sessionDoc.collection(
                isTeacher ? 'teacherCandidates' : 'studentCandidates'
            );
            candidatesCollection.add(event.candidate.toJSON());
        }
    };
}

function handleRemoteCandidate(candidate) {
    if (remoteDescriptionSet) {
        console.log('Adding ICE candidate immediately');
        peerConnection.addIceCandidate(candidate).catch(err => console.error('Error adding ICE candidate:', err));
    } else {
        console.log('Queuing ICE candidate');
        pendingCandidates.push(candidate);
    }
}

// Handle teacher's connection
async function handleTeacherConnection() {
    // Create and set offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await sessionDoc.set({
        offer: {
            type: offer.type,
            sdp: offer.sdp
        }
    });

    // Listen for answer
    sessionDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            setRemoteDescriptionAndFlush(answerDescription);
        }
    });
}

// Handle student's connection
async function handleStudentConnection() {
    try {
        console.log('Student: Setting up connection...');
        
        // Listen for offer
        sessionDoc.onSnapshot((snapshot) => {
            try {
                console.log('Student: Received session update');
                const data = snapshot.data();
                
                if (!data) {
                    console.log('Student: No session data yet');
                    return;
                }

                if (!peerConnection.currentRemoteDescription && data.offer) {
                    console.log('Student: Processing offer');
                    const offerDescription = new RTCSessionDescription(data.offer);
                    
                    setRemoteDescriptionAndFlush(offerDescription);
                }
            } catch (error) {
                console.error('Student: Error handling session update:', error);
            }
        });
    } catch (error) {
        console.error('Student: Error in handleStudentConnection:', error);
        throw error;
    }
}

async function setRemoteDescriptionAndFlush(desc) {
    await peerConnection.setRemoteDescription(desc);
    remoteDescriptionSet = true;
    console.log('Remote description set. Flushing', pendingCandidates.length, 'queued ICE candidates.');
    pendingCandidates.forEach(candidate => {
        peerConnection.addIceCandidate(candidate).catch(err => console.error('Error adding queued ICE candidate:', err));
    });
    pendingCandidates = [];
}

// Setup control buttons
function setupControls() {
    // Toggle video
    toggleVideoBtn.addEventListener('click', () => {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !videoTrack.enabled;
            videoTrack.enabled = isVideoEnabled;
            localStorage.setItem('cameraDisabled', !isVideoEnabled);
            toggleVideoBtn.innerHTML = isVideoEnabled ? 
                '<i class="fas fa-video"></i>' : 
                '<i class="fas fa-video-slash"></i>';
            toggleVideoBtn.classList.toggle('video-off');
        }
    });

    // Toggle audio
    toggleAudioBtn.addEventListener('click', () => {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        toggleAudioBtn.innerHTML = audioTrack.enabled ? 
            '<i class="fas fa-microphone"></i>' : 
            '<i class="fas fa-microphone-slash"></i>';
        toggleAudioBtn.classList.toggle('muted');
    });

    // End call
    endCallBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to end the session?')) {
            try {
                // Stop all tracks
                localStream.getTracks().forEach(track => track.stop());
                
                // Close peer connection
                peerConnection.close();
                
                // Update session status
                await sessionDoc.update({
                    status: 'ended',
                    endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    endedBy: isTeacher ? 'teacher' : 'student'
                });

                // Redirect
                window.location.href = isTeacher ? 'my-teaching.html' : 'my-courses.html';
            } catch (error) {
                console.error('Error ending session:', error);
                alert('Failed to end session properly. Please try again.');
            }
        }
    });

    // Toggle screen share
    toggleScreenShareBtn.addEventListener('click', toggleScreenShare);
}

// Add screen sharing functionality
async function toggleScreenShare() {
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: false
            });

            // Replace video track in peer connection
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
            await sender.replaceTrack(videoTrack);

            // Update UI
            localVideo.srcObject = screenStream;
            isScreenSharing = true;
            toggleScreenShareBtn.classList.add('active');
            
            // Handle when user stops sharing
            videoTrack.onended = () => {
                stopScreenShare();
            };
        } else {
            stopScreenShare();
        }
    } catch (error) {
        console.error('Error sharing screen:', error);
        alert('Failed to share screen. Please try again.');
    }
}

function stopScreenShare() {
    if (screenStream) {
        // Stop screen sharing
        screenStream.getTracks().forEach(track => track.stop());
        
        // Replace with camera track
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(videoTrack);
        
        // Update UI
        localVideo.srcObject = localStream;
        isScreenSharing = false;
        toggleScreenShareBtn.classList.remove('active');
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
}); 
