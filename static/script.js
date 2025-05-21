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

    const startRecordingButton = document.getElementById('startRecording');
    const stopRecordingButton = document.getElementById('stopRecording');
    const recordingStatus = document.getElementById('recordingStatus');

    // Add cleanup function
    function cleanup() {
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
            alert('Error processing audio: ' + error.message);
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload and Transcribe';
        }
    });

    function displayTranscript(transcript) {
        transcriptContainer.innerHTML = '';
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

    // Recording functionality
    async function startRecording() {
        try {
            cleanup();
            startRecordingButton.disabled = true;
            stopRecordingButton.disabled = false;
            recordingStatus.textContent = 'Recording...';
            isRecording = true;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                console.log('Recording stopped');
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                if (!audioBlob) {
                    console.error('Audio blob is null');
                    return;
                }
                console.log('Created audio blob');

                audioChunks = [];
                stopRecordingButton.disabled = true;
                startRecordingButton.disabled = false;
                recordingStatus.textContent = 'Recording stopped. Transcribing...';

                try {
                    // Create audio player
                    const audioPlayer = document.createElement('audio');
                    audioPlayer.controls = true;
                    audioPlayer.style.marginBottom = '1rem';
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
                        return;
                    }
                    downloadAudioContainer.innerHTML = '';
                    downloadAudioContainer.appendChild(audioPlayer);
                    downloadAudioContainer.appendChild(downloadLink);

                    // Create a FormData object with the recorded audio
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recorded_audio.wav');

                
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
            };

            mediaRecorder.start();
            startRecordingButton.disabled = true;
            stopRecordingButton.disabled = false;
            recordingStatus.textContent = 'Recording...';
            isRecording = true;
        } catch (error) {
            console.error('Error accessing microphone: ' + error.message);
            alert('Error accessing microphone: ' + error.message);
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
        }
    }

    startRecordingButton.addEventListener('click', startRecording);
    stopRecordingButton.addEventListener('click', stopRecording);
});