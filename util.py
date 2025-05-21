"""
Utility functions for audio transcription
"""
import logging

def print_segments(segments):
    """Print transcription segments with their details.
    
    Args:
        segments (list): List of transcription segments
    """
    logging.info("\nTranscription Segments:")
    for i, segment in enumerate(segments, 1):
        start = segment.get('start')
        end = segment.get('end')
        text = segment.get('text')
        speaker = segment.get('speaker')
        logging.info(f"\nSegment {i}:")
        logging.info(f"Start: {start:.2f}s")
        logging.info(f"End: {end:.2f}s")
        logging.info(f"Speaker: {speaker}")
        logging.info(f"Text: {text}")