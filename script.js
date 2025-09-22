// https://recog-gilt.vercel.app/


document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const API_BASE_URL = 'https://60da07cd25c7.ngrok-free.app'; // ⚠️ PASTE YOUR NGROK URL HERE
    const VERIFY_URL = `${API_BASE_URL}/verify`;
    const REGISTER_URL = `${API_BASE_URL}/register`;

    // --- DOM Elements ---
    const video = document.getElementById('video');
    const verifyButton = document.getElementById('verify-button');
    const registerButton = document.getElementById('register-button');
    const nameInput = document.getElementById('name-input');
    const statusElement = document.getElementById('status');
    
    // --- NEW: Canvas for freezing the frame ---
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            // Wait for the video to start playing to get correct dimensions
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
            setStatus('Ready', 'ready');
        } catch (err) {
            console.error("Error accessing webcam:", err);
            setStatus('Error: Could not access webcam. Please grant permission.', 'failed');
        }
    }

    /**
     * MODIFIED: This function now captures the single frozen frame from the canvas.
     * @returns {string} The Base64 encoded image string from the canvas.
     */
    function captureFrozenFrame() {
        const dataUrl = canvas.toDataURL('image/jpeg');
        return dataUrl.split(',')[1];
    }

    /**
     * MODIFIED: Handles the new freeze-and-verify logic.
     */
    async function handleVerification() {
        setStatus('Verifying...', 'verifying');
        setControlsDisabled(true);

        // --- NEW: Freeze frame logic ---
        // 1. Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 2. Hide the live video and show the frozen canvas
        video.style.display = 'none';
        canvas.style.display = 'block';
        
        try {
            // 3. Capture the image data from the canvas
            const frozenFrame = captureFrozenFrame();
            
            // 4. Send the frozen frame to the API
            const response = await fetch(VERIFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frames: [frozenFrame] }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || `Server error: ${response.status}`);
            }

            if (result && result.name) {
                const percentage = result.match_percentage;
                setStatus(`Success! Welcome, ${result.name} (${percentage.toFixed(1)}% Match)`, 'success');
            } else {
                setStatus('Verification FAILED.', 'failed');
            }

        } catch (error) {
            console.error("Verification failed:", error);
            setStatus(`Error: ${error.message}`, 'failed');
        } finally {
            // 5. After a delay, reset to the live view
            resetControlsAfterDelay();
        }
    }
    
    /**
     * NOTE: handleRegistration is kept simple and captures directly from the live video.
     * You could apply the same freeze logic here if desired.
     */
    async function handleRegistration() {
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter a name before registering.');
            return;
        }
        
        setStatus(`Registering ${name}...`, 'verifying');
        setControlsDisabled(true);
        
        // Temporarily draw to canvas to capture a frame without freezing the view
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = captureFrozenFrame();

        try {
            const response = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, image: image }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Registration failed.');
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

    // --- Helper functions ---
    function setStatus(message, type) {
        statusElement.textContent = `Status: ${message}`;
        statusElement.className = 'status';
        statusElement.classList.add(`status-${type}`);
    }
    
    function setControlsDisabled(disabled) {
        verifyButton.disabled = disabled;
        registerButton.disabled = disabled;
        nameInput.disabled = disabled;
    }

    /**
     * MODIFIED: Resets controls AND switches back to the live video feed.
     */
    function resetControlsAfterDelay() {
        setTimeout(() => {
            setControlsDisabled(false);
            setStatus('Ready', 'ready');
            // --- NEW: Switch back to live video ---
            canvas.style.display = 'none';
            video.style.display = 'block';
        }, 4000); // 4-second delay to show the result on the frozen frame
    }

    // --- Initialize the application ---
    initCamera();
    verifyButton.addEventListener('click', handleVerification);
    registerButton.addEventListener('click', handleRegistration);
});