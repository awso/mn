from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import logging
import whisperx
from util import print_segments
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# Set up logging
logging.basicConfig(level=logging.DEBUG)
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

device = "cpu"
batch_size = 16 # reduce if low on GPU mem
compute_type = "int8" 

# Load the WhisperX model
try:
    modelX = whisperx.load_model("large-v2", device=device, compute_type=compute_type)
    logging.info("WhisperX model large-v2 loaded successfully")
except Exception as e:
    logging.error(f"Failed to load WhisperX model: {str(e)}")
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
        
        # Save audio file
        temp_path = os.path.join(temp_dir, "temp_audio.wav")
        audio_file.save(temp_path)
        logging.info("Saved audio file to temporary location")        
        
        # Transcribe using WhisperX
        logging.info("Starting transcription with Whisper model")
        audio = whisperx.load_audio(temp_path)
        result = modelX.transcribe(audio, batch_size=batch_size)
        logging.info("Transcription completed successfully")
        logging.info("Segments before alignment: ", result["segments"])

        # Align
        model_a, metadata = whisperx.load_align_model(language_code=result["language"],
                                              device=device)
        result = whisperx.align(result["segments"], model_a,
                        metadata,
                        audio,
                        device,
                        return_char_alignments=False)

        # diarize
        diarize_model = whisperx.diarize.DiarizationPipeline(
            use_auth_token=os.getenv("HUGGING_FACE_TOKEN"),
            device=device)
        diarize_segments = diarize_model(audio, min_speakers=1, max_speakers=4)
        logging.info("Segments after diarization: ", diarize_segments)
        
        result = whisperx.assign_word_speakers(diarize_segments, result)
        print_segments(result['segments']);
        # Format the response
        transcript = []
        for segment in result['segments']:
            transcript.append({
                'start': segment['start'],
                'end': segment['end'],
                'speaker': segment['speaker'],
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