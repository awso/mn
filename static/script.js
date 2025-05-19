document.addEventListener('DOMContentLoaded', () => {
    const uploadButton = document.getElementById('uploadButton');
    const audioFileInput = document.getElementById('audioFile');
    const transcriptContainer = document.getElementById('transcriptContainer');

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

            // Clear existing transcript
            transcriptContainer.innerHTML = '';

            // Display new transcript
            data.transcript.forEach(segment => {
                const segmentElement = document.createElement('div');
                segmentElement.className = 'transcript-item';
                segmentElement.innerHTML = `
                    <span class="speaker-label">${segment.speaker}</span>
                    <span class="timestamp">[${formatTime(segment.start)} - ${formatTime(segment.end)}]</span>
                    <p>${segment.text}</p>
                `;
                transcriptContainer.appendChild(segmentElement);
            });

        } catch (error) {
            alert('Error processing audio: ' + error.message);
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload and Transcribe';
        }
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
});
