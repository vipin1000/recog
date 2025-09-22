document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // ⚠️ PASTE YOUR NGROK URL HERE ⚠️
    const API_BASE_URL = 'https://9fd4bcbb1554.ngrok-free.app';
    const VERIFY_URL = `${API_BASE_URL}/verify`;
    const REGISTER_URL = `${API_BASE_URL}/register`;

    // For verification, we send a few frames for blink detection (liveness).
    // For simple recognition, FRAME_COUNT can be 1. For blink check, use 15-20.
    const VERIFY_FRAME_COUNT = 1; // Set to 1 for faster verification without blink check
    const FRAME_INTERVAL = 1;   // Milliseconds between each frame capture

    // --- DOM Elements ---
    const video = document.getElementById('video');
    const verifyButton = document.getElementById('verify-button');
    const registerButton = document.getElementById('register-button');
    const nameInput = document.getElementById('name-input');
    const statusElement = document.getElementById('status');
    
    /**
     * Accesses the user's webcam and streams the video.
     */
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            setStatus('Ready', 'ready');
        } catch (err) {
            console.error("Error accessing webcam:", err);
            setStatus('Error: Could not access webcam. Please grant permission.', 'failed');
        }
    }

    /**
     * Captures a sequence of frames from the video feed.
     * @returns {Promise<string[]>} A promise resolving to an array of Base64 encoded images.
     */
    async function captureFrames(frameCount, interval) {
        const frames = [];
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');

        for (let i = 0; i < frameCount; i++) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            const base64Data = dataUrl.split(',')[1];
            frames.push(base64Data);
            if (frameCount > 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        return frames;
    }

    /**
     * Handles the face verification process.
     */
    async function handleVerification() {
        setStatus('Verifying...', 'verifying');
        setControlsDisabled(true);

        try {
            const frames = await captureFrames(VERIFY_FRAME_COUNT, FRAME_INTERVAL);
            const response = await fetch(VERIFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frames: frames }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || `Server error: ${response.status}`);
            }

            if (result && result.name) {
                const percentage = result.match_percentage;
                setStatus(`Success! Welcome, ${result.name} (${percentage.toFixed(1)}% Match)`, 'success');
            } else {
                setStatus('Verification FAILED. Face not recognized.', 'failed');
            }

        } catch (error) {
            console.error("Verification failed:", error);
            setStatus(`Error: ${error.message}`, 'failed');
        } finally {
            resetControlsAfterDelay();
        }
    }
    
    /**
     * Handles the user registration process.
     */
    async function handleRegistration() {
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter a name before registering.');
            return;
        }

        setStatus(`Registering ${name}...`, 'verifying');
        setControlsDisabled(true);

        try {
            const frames = await captureFrames(1, 0); // Capture just one frame for registration
            const image = frames[0];
            
            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, image: image }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || 'Registration failed.');
            }
            
            setStatus(result.message, 'success');
            alert(result.message);

        } catch (error) {
            console.error("Registration failed:", error);
            setStatus(`Registration Error: ${error.message}`, 'failed');
            alert(`Registration failed: ${error.message}`);
        } finally {
            resetControlsAfterDelay();
            nameInput.value = '';
        }
    }

    /**
     * Helper function to update the status message and style.
     */
    function setStatus(message, type) {
        statusElement.textContent = `Status: ${message}`;
        statusElement.className = 'status'; // Reset classes
        statusElement.classList.add(`status-${type}`);
    }
    
    /**
     * Disables or enables input controls.
     */
    function setControlsDisabled(disabled) {
        verifyButton.disabled = disabled;
        registerButton.disabled = disabled;
        nameInput.disabled = disabled;
    }

    /**
     * Resets controls to their default state after a delay.
     */
    function resetControlsAfterDelay() {
         setTimeout(() => {
            setControlsDisabled(false);
            setStatus('Ready', 'ready');
        }, 4000);
    }

    // --- Initialize the application ---
    initCamera();
    verifyButton.addEventListener('click', handleVerification);
    registerButton.addEventListener('click', handleRegistration);
});