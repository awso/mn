from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import whisper
from pydub import AudioSegment
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Load the Whisper model
try:
    model = whisper.load_model("base")
    logging.info("Whisper model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load Whisper model: {str(e)}")
    raise

@app.route('/')
def index():
    logging.info("Serving index.html")
    return app.send_static_file('index.html')

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    logging.info("Received transcription request")
    
    # Check if file was uploaded
    if 'audio' not in request.files:
        logging.error("No audio file in request")
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        logging.error("Empty filename in request")
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, "temp_audio.wav")
        logging.info(f"Created temporary file at: {temp_path}")
        
        # Save and convert audio file
        audio_file.save(temp_path)
        logging.info("Saved audio file to temporary location")
        
        # Convert to WAV if needed
        audio = AudioSegment.from_file(temp_path)
        audio.export(temp_path, format="wav")
        logging.info("Converted audio to WAV format")
        
        # Transcribe using Whisper
        logging.info("Starting transcription with Whisper model")
        result = model.transcribe(temp_path)
        logging.info("Transcription completed successfully")
        
        # Format the response
        transcript = []
        for segment in result['segments']:
            transcript.append({
                'start': segment['start'],
                'end': segment['end'],
                'speaker': "Speaker 1",
                'text': segment['text']
            })
        
        logging.info(f"Returning transcript with {len(transcript)} segments")
        return jsonify({"transcript": transcript})
        
    except Exception as e:
        error_msg = f"Error processing audio: {str(e)}"
        logging.error(error_msg)
        return jsonify({"error": error_msg}), 500
    finally:
        # Clean up temporary files
        if os.path.exists(temp_path):
            os.remove(temp_path)
            logging.debug(f"Removed temporary file: {temp_path}")
        os.rmdir(temp_dir)
        logging.debug(f"Removed temporary directory: {temp_dir}")

if __name__ == '__main__':
    logging.info("Starting Flask application")
    app.run(debug=True, port=5000)