document.addEventListener('DOMContentLoaded', () => {
    const uploadButton = document.getElementById('uploadButton');
    const audioFileInput = document.getElementById('audioFile');
    const transcriptContainer = document.getElementById('transcriptContainer');
    const speakerCustomization = document.getElementById('speakerCustomization');
    const speakerList = document.getElementById('speakerList');
    const updateSpeakersButton = document.getElementById('updateSpeakers');
    const downloadAudioContainer = document.getElementById('downloadAudioContainer');

    let currentTranscript = null;
    let speakerInputs = new Map();
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let currentStream = null;

    const startRecordingButton = document.getElementById('startRecording');
    const stopRecordingButton = document.getElementById('stopRecording');
    const recordingStatus = document.getElementById('recordingStatus');

    // Add cleanup function
    function cleanup() {
        // Clean up existing recording
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder = null;
        }
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
            });
            currentStream = null;
        }
        transcriptContainer.innerHTML = ''; // Clear transcripts
        speakerList.innerHTML = ''; // Clear speaker customization inputs
        speakerCustomization.style.display = 'none'; // Hide customization section
        speakerInputs.clear(); // Clear speaker input map
        currentTranscript = null; // Reset current transcript
        mediaRecorder = null;
        audioChunks = [];
        isRecording = false;
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
        recordingStatus.textContent = '';
        downloadAudioContainer.innerHTML = '';
    }

    // Add event listener for file selection
    audioFileInput.addEventListener('change', () => {
        cleanup();
    });

    uploadButton.addEventListener('click', async () => {
        const file = audioFileInput.files[0];
        if (!file) {
            alert('Please select an audio file first!');
            return;
        }
    
        uploadButton.disabled = true;
        uploadButton.textContent = 'Processing...';
    
        const formData = new FormData();
        formData.append('audio', file);
    
        try {
            await processTranscription(formData);
        } catch (error) {
            alert('Error processing audio: ' + error.message);
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload and Transcribe';
        }
    });

    function displayTranscript(transcript) {
        transcriptContainer.innerHTML = '';
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
        recordingStatus.textContent = 'Not recording';
        
        if (!transcript || transcript.length === 0) {
            const noDataElement = document.createElement('div');
            noDataElement.className = 'no-data-message';
            noDataElement.textContent = 'Oops, no data available';
            transcriptContainer.appendChild(noDataElement);
            return;
        }

        transcript.forEach(segment => {
            const segmentElement = document.createElement('div');
            segmentElement.className = 'transcript-item';
            segmentElement.innerHTML = `
                <span class="speaker-label">${segment.speaker}</span>
                <span class="timestamp">[${formatTime(segment.start)} - ${formatTime(segment.end)}]</span>
                <p>${segment.text}</p>
            `;
            transcriptContainer.appendChild(segmentElement);
        });
    }

    // Show speaker customization section
    function showSpeakerCustomization(transcript) {
        // Get unique speakers from the transcript
        const speakers = new Set();
        transcript.forEach(segment => speakers.add(segment.speaker));
    
        // Create input fields for each speaker
        speakerList.innerHTML = ''; // Clear existing inputs
        speakers.forEach(speaker => {
            const speakerItem = document.createElement('div');
            speakerItem.className = 'speaker-item';
    
            // Create input element
            const input = document.createElement('input');
            input.type = 'text';
            input.value = speaker;
            input.placeholder = `Enter name for ${speaker}`;
            
            // Store the input in our map
            speakerInputs.set(speaker, input);
    
            // Create label
            const label = document.createElement('label');
            label.appendChild(document.createTextNode(speaker));
            label.appendChild(input);
    
            speakerItem.appendChild(label);
            speakerList.appendChild(speakerItem);
        });
    
        speakerCustomization.style.display = 'block';
        
        // Remove existing event listener if it exists
        updateSpeakersButton.removeEventListener('click', updateSpeakerNames);
        // Add new event listener
        updateSpeakersButton.addEventListener('click', updateSpeakerNames);
    }

    function updateSpeakerNames() {
        // Update transcript with new speaker names
        transcriptContainer.innerHTML = '';
        currentTranscript.forEach(segment => {
            const input = speakerInputs.get(segment.speaker);
            const speakerName = input.value || segment.speaker;

            const segmentElement = document.createElement('div');
            segmentElement.className = 'transcript-item';
            segmentElement.innerHTML = `
                <span class="speaker-label">${speakerName}</span>
                <span class="timestamp">[${formatTime(segment.start)} - ${formatTime(segment.end)}]</span>
                <p>${segment.text}</p>
            `;
            transcriptContainer.appendChild(segmentElement);
        });
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async function processTranscription(formData) {
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
    
            const data = await response.json();
    
            if (data.error) {
                throw new Error(data.error);
            }
    
            currentTranscript = data.transcript;
            displayTranscript(currentTranscript);
            showSpeakerCustomization(currentTranscript);
    
        } catch (error) {
            console.error('Error processing audio: ' + error.message);
            alert('Error processing audio: ' + error.message);
        }
    }

    // Recording functionality
    async function startRecording() {
        try {
            cleanup();
            startRecordingButton.disabled = true;
            stopRecordingButton.disabled = false;
            recordingStatus.textContent = 'Recording...';
            isRecording = true;
    
            // Get audio stream with basic settings
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            devices.forEach(device => console.log(`${device.kind}: ${device.label}`));
            const fallbackMic = devices.find(d => d.kind === 'audioinput');
            console.log('Fallback mic: ', fallbackMic);
        
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: fallbackMic?.deviceId || undefined,
                    echoCancellation: false, //disable this, otherwise it does not record sounds from the mic.
                    noiseSuppression: true, 
                }
            });
    
            // Store the stream reference for cleanup
            currentStream = stream;
            mediaRecorder = new MediaRecorder(stream);
    
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
    
            mediaRecorder.onstop = async () => {
                console.log('Recording stopped');
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                if (!audioBlob) {
                    console.error('Audio blob is null');
                    return;
                }
                console.log('Created audio blob');
                setupAudioControls(audioBlob);
    
                // Create a FormData object with the recorded audio
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recorded_audio.wav');
    
                // *** IMPORTANT: Stop the stream's tracks *after* onstop processing ***
                // This ensures the microphone is released after all recording-related tasks are done.
                if (currentStream) {
                    currentStream.getTracks().forEach(track => {
                        track.stop(); // Stop each track in the stream
                        console.log(`Track stopped: ${track.kind} - ${track.label}`);
                        });
                    currentStream = null; // Clear the reference
                }

                await processTranscription(formData);
            };
    
            mediaRecorder.start();
    
        } catch (error) {
            console.error('Error accessing audio: ' + error.message);
            alert('Error accessing audio: ' + error.message);
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop(); // This will trigger mediaRecorder.onstop
            console.log('stopRecording() called. Waiting for onstop event...');
            // Do NOT set mediaRecorder = null or isRecording = false here.
            // These cleanups should happen inside mediaRecorder.onstop
            // to ensure proper sequence and resource release.
        } else {
            console.log('MediaRecorder not active or not recording.');
        }
    }

    function setupAudioControls(audioBlob) {
        console.log('Creating audio controls');

        audioChunks = [];
        stopRecordingButton.disabled = true;
        startRecordingButton.disabled = false;
        recordingStatus.textContent = 'Recording stopped. Transcribing...';

        // Create audio player
        const audioPlayer = document.createElement('audio-player');
        audioPlayer.controls = true;
        audioPlayer.src = URL.createObjectURL(audioBlob);
        console.log('Created audio player');

        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(audioBlob);
        downloadLink.download = 'recorded_audio.wav';
        downloadLink.className = 'download-link';
        downloadLink.textContent = 'Download Recorded Audio';
        downloadLink.style.display = 'block';
        console.log('Created download link');

        // Clear existing content and add new elements
        if (!downloadAudioContainer) {
            console.error('downloadAudioContainer not found');
            return null;
        }
        downloadAudioContainer.innerHTML = '';
        downloadAudioContainer.appendChild(audioPlayer);
        downloadAudioContainer.appendChild(downloadLink);

        return { audioPlayer, downloadLink };
    }

    startRecordingButton.addEventListener('click', startRecording);
    stopRecordingButton.addEventListener('click', stopRecording);
});