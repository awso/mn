# Audio Transcription Service

A web application that allows users to upload audio files and get transcriptions with timestamps and speaker identification.

## Features

- Upload audio files
- Automatic transcription using OpenAI's Whisper
- Display transcriptions with timestamps
- Modern and responsive UI

## Setup

0. Create a `.env` file in the project root with your Hugging Face token:
```bash
HUGGING_FACE_TOKEN=your_hugging_face_token
``` 

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Click the "Choose File" button to select an audio file
2. Click "Upload and Transcribe"
3. Wait for the processing to complete
4. View the transcript with timestamps and speaker identification

## Supported Audio Formats

- WAV
- MP3
- Any format supported by pydub
