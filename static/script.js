document.addEventListener('DOMContentLoaded', () => {
    const uploadButton = document.getElementById('uploadButton');
    const audioFileInput = document.getElementById('audioFile');
    const transcriptContainer = document.getElementById('transcriptContainer');
    const speakerCustomization = document.getElementById('speakerCustomization');
    const speakerList = document.getElementById('speakerList');
    const updateSpeakersButton = document.getElementById('updateSpeakers');

    let currentTranscript = null;
    let speakerInputs = new Map();

    // Add cleanup function
    function cleanup() {
        transcriptContainer.innerHTML = ''; // Clear transcripts
        speakerList.innerHTML = ''; // Clear speaker customization inputs
        speakerCustomization.style.display = 'none'; // Hide customization section
        speakerInputs.clear(); // Clear speaker input map
        currentTranscript = null; // Reset current transcript
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
});