import os
import json
from pydub import AudioSegment
import tempfile
import logging
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import datetime
import time
from openai import OpenAI
import re
import shutil
import urllib.parse

# Initialize OpenAI client
client = OpenAI()

# Constants / Configurations
OBSERVATION_DIR = "/Users/peterspier/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings"
OBSIDIAN_VAULT_PATH = "/Users/peterspier/Documents/spierp"
DATABASE_PATH = "transcription_database.json"
AUDIO_EXT = ".m4a"
MAX_AUDIO_CHUNK_MB = 24
BITRATE_KBPS = 48
WATCH_LOOP_INTERVAL = 5
RETROACTIVE_ENABLED = False

# Options for transcription:
# - "gpt-4o-transcribe": The most accurate model with best understanding of context and formatting
# - "gpt-4o-mini-transcribe": Faster and cheaper than gpt-4o-transcribe with good accuracy
TRANSCRIPTION_MODEL = "gpt-4o-transcribe"
TRANSCRIPTION_LANGUAGE = "en"  # ISO-639-1 format (e.g., "en" for English)

# New audio destination directory for copied files
AUDIO_DEST_DIR = "/Users/peterspier/Library/Mobile Documents/com~apple~CloudDocs/audio/voice-memos"

# File stability checks
STABILITY_CHECK_INTERVAL = 2
STABILITY_ATTEMPTS = 3

logging.basicConfig(filename='transcription.log', level=logging.INFO,
                    format='%(asctime)s:%(levelname)s:%(message)s')

def log_and_print(message, level=logging.INFO):
    print(message)
    logging.log(level, message)

def load_database(db_path=DATABASE_PATH):
    if os.path.exists(db_path):
        with open(db_path, 'r') as db_file:
            return json.load(db_file)
    return {}

def save_database(db, db_path=DATABASE_PATH):
    with open(db_path, 'w') as db_file:
        json.dump(db, db_file, indent=4)

def parse_filename_to_datetime(filename):
    # Assuming format: 'YYYYMMDD HHMMSS-<identifier>.m4a'
    base_name = os.path.basename(filename).split('.')[0]
    date_time_str = base_name.split('-')[0]
    date_time_obj = datetime.datetime.strptime(date_time_str, '%Y%m%d %H%M%S')
    return date_time_obj

def wait_for_file_stability(file_path, attempts=STABILITY_ATTEMPTS, interval=STABILITY_CHECK_INTERVAL):
    stable_count = 0
    last_size = None

    while stable_count < attempts:
        if not os.path.exists(file_path):
            log_and_print(f"File {file_path} disappeared before stabilization.", logging.WARNING)
            return False

        current_size = os.path.getsize(file_path)
        if current_size == last_size and last_size is not None:
            stable_count += 1
        else:
            stable_count = 0
        last_size = current_size

        if stable_count < attempts:
            time.sleep(interval)
    return True

def split_audio_file(file_path, max_size_in_mb=MAX_AUDIO_CHUNK_MB, bitrate_kbps=BITRATE_KBPS):
    audio = AudioSegment.from_file(file_path)
    max_size_in_bytes = max_size_in_mb * 1024 * 1024
    bitrate_bps = bitrate_kbps * 1000
    split_size_in_ms = int((max_size_in_bytes * 8 * 1000) / bitrate_bps)
    return [audio[i:i + split_size_in_ms] for i in range(0, len(audio), split_size_in_ms)]

def generate_summary_and_tags(transcription_text, context_info=None):
    model = "o1-mini"
    tags_list_str = (
        "#AI #adventure #art #business #career #climate #programming #community #communication #construction "
        "#cooking #courses #creative #crypto #culture #data-science #decision-making #design #DIY "
        "#education #emotions #entrepreneurship #ethics #exercise #family #fashion #finance #fitness "
        "#food #friends #games #gardening #goals #gratitude #habits #health #hobbies #home-improvement "
        "#ideas #inspiration #innovation #investing #journaling #kids #knowledge-management #language "
        "#leadership #learning #lessons #machine-learning #marriage #marketing #media #memories "
        "#mentalhealth #mindfulness #mindset #movies #music #nature #networking #nutrition #outdoors "
        "#parenting #pets #personal-development #philosophy #photography #planning #podcasts #politics "
        "#problem-solving #productivity #questions #quotes #reading #reflection #relationships "
        "#remote-work #resilience #romance #school #science #sex #skills #society #spirituality "
        "#sports #startups #stories #strategy #sustainability #teamwork #tech #time-management #tools "
        "#traditions #travel #travel-destinations #tutorials #videogames #video-editing #wellness #wildlife "
        "#work #workflows #writing"
    )

    context_section = ""
    if context_info:
        context_section = f"You have the following context about the speaker/environment:\n{context_info}\n\n"

    summary_prompt = (
        "You are an assistant that produces concise, helpful summaries of audio transcripts. "
        "Your goal is to capture the main ideas and context in one short paragraph, highlighting key points. "
        "Avoid extraneous details.\n\n"
        f"{context_section}"
        f"Summarize the following transcript in one short paragraph:\n\n{transcription_text}"
    )

    tags_prompt = (
        "You are a tagging assistant. Analyze the transcript and select the most relevant tags "
        "from the provided list. Only choose from the tags listed and output them separated by a space. "
        "If no tags apply, return an empty line.\n\n"
        f"Available tags: {tags_list_str}\n\n"
        f"Transcript:\n{transcription_text}\n\n"
        "Select relevant tags only from the list above."
    )

    try:
        summary_response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": summary_prompt}],
        )
        summary_description = summary_response.choices[0].message.content.strip()

        tags_response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": tags_prompt}],
        )
        tags_content = tags_response.choices[0].message.content.strip()

        potential_tags = set(tags_list_str.split())
        tags_list = [tag for tag in tags_content.split() if tag in potential_tags]

        return summary_description, tags_list
    except Exception as e:
        log_and_print(f"Error generating summary or tags: {e}", logging.ERROR)
        return "", []

def construct_output_path(date_time_obj, category_config):
    base_path = category_config.get("path", "07 Inbox/")
    full_base = os.path.join(OBSIDIAN_VAULT_PATH, base_path)
    structure = category_config.get("structure", [])
    current_path = full_base

    for level in structure:
        if level == "year":
            year_str = date_time_obj.strftime('%Y')
            current_path = os.path.join(current_path, year_str)
        elif level == "month":
            month_str = date_time_obj.strftime('%m-%B')
            current_path = os.path.join(current_path, month_str)

    os.makedirs(current_path, exist_ok=True)
    return current_path

def create_markdown_file(file_path, date_time_obj, content, category_config, audio_filename):
    output_dir = construct_output_path(date_time_obj, category_config)
    date_str = date_time_obj.strftime('%Y-%m-%d %I%M%p')
    file_path_out = os.path.join(output_dir, f"{date_str}.md")

    with open(file_path_out, 'w') as md_file:
        md_file.write(content)
    log_and_print(f"Markdown file created: {file_path_out}")

    # If integrate_into_daily_note is True, attempt linking in daily notes
    if category_config.get("integrate_into_daily_note", False):
        file_date = date_time_obj.strftime('%Y-%m-%d')
        if category_config.get("path") == "02 Daily Notes":
            daily_note_path = os.path.join(output_dir, f"{file_date}.md")
            try:
                with open(daily_note_path, 'r+') as file:
                    file_content = file.read()
                    link_text = f"\n- [[{date_str}.md|{date_str}]]"
                    new_content = file_content.replace("Voice Memos:\n", f"Voice Memos:\n{link_text}\n")
                    file.seek(0)
                    file.write(new_content)
                    file.truncate()
                log_and_print(f"Link to voice memo added in daily note: {daily_note_path}")
            except FileNotFoundError:
                log_and_print(f"No daily note file for {file_date} found. Link not added.", logging.WARNING)

def detect_category(transcription_text):
    text_lower = transcription_text.lower()
    first_ten_words = " ".join(text_lower.split()[:10])
    for keyword in CATEGORIES.keys():
        if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', first_ten_words):
            return CATEGORIES[keyword], keyword
    return DEFAULT_CATEGORY, None

def transcribe_audio_file(file_path, db):
    log_and_print(f"Starting transcription for file: {file_path}")
    if db.get(file_path, {}).get("transcribed"):
        log_and_print(f"File already transcribed: {file_path}")
        return

    if not wait_for_file_stability(file_path):
        log_and_print(f"File {file_path} did not stabilize. Skipping transcription.", logging.ERROR)
        return

    for attempt in range(3):
        try:
            audio_chunks = split_audio_file(file_path)
            break
        except Exception as e:
            log_and_print(f"Error reading audio file on attempt {attempt + 1}: {e}", logging.WARNING)
            if attempt < 2:
                time.sleep(2)
            else:
                log_and_print(f"Failed to read audio file after 3 attempts. Skipping: {file_path}", logging.ERROR)
                return

    transcriptions = []
    try:
        for i, chunk in enumerate(audio_chunks):
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=True) as temp_audio_file:
                mono_chunk = chunk.set_channels(1)
                mono_chunk.export(temp_audio_file.name, format="mp3", bitrate=f"{BITRATE_KBPS}k", parameters=["-ar", "16000"])
                log_and_print(f"Transcribing audio chunk {i + 1}/{len(audio_chunks)}")
                with open(temp_audio_file.name, "rb") as audio_file:
                    # Note: gpt-4o-transcribe and gpt-4o-mini-transcribe only support 'json' response format
                    response_format = "json"
                    
                    try:
                        transcript = client.audio.transcriptions.create(
                            model=TRANSCRIPTION_MODEL,
                            file=audio_file,
                            response_format=response_format,
                            temperature=0,
                            language=TRANSCRIPTION_LANGUAGE
                        )
                        transcriptions.append(transcript.text)
                    except Exception as e:
                        log_and_print(f"Error in transcription: {e}", logging.ERROR)
                        # If we're using a model that doesn't support the response format, try again with default
                        if "response_format" in str(e) and TRANSCRIPTION_MODEL != "whisper-1":
                            log_and_print("Falling back to whisper-1 model for this transcription", logging.WARNING)
                            try:
                                transcript = client.audio.transcriptions.create(
                                    model="whisper-1",
                                    file=audio_file,
                                    response_format="json",
                                    language=TRANSCRIPTION_LANGUAGE
                                )
                                transcriptions.append(transcript.text)
                            except Exception as e2:
                                log_and_print(f"Fallback transcription also failed: {e2}", logging.ERROR)
                                raise
                        else:
                            raise

        transcription_text = "\n".join(transcriptions).strip()
        category_config, matched_keyword = detect_category(transcription_text)

        # Use context_info in the summary prompt
        summary, tags = generate_summary_and_tags(transcription_text, context_info=category_config.get("context_info"))
        tags = category_config.get("tags", []) + tags
        truncated_summary = summary[:200]

        date_time_obj = parse_filename_to_datetime(file_path)
        date_str = date_time_obj.strftime('%Y-%m-%d %I%M%p')

        # Copy the original m4a file to the new location
        os.makedirs(AUDIO_DEST_DIR, exist_ok=True)
        audio_filename = f"{date_str}.m4a"
        dest_audio_path = os.path.join(AUDIO_DEST_DIR, audio_filename)
        shutil.copyfile(file_path, dest_audio_path)

        # Get audio duration
        audio = AudioSegment.from_file(file_path)
        total_duration_ms = len(audio)
        total_duration_s = total_duration_ms // 1000
        minutes = total_duration_s // 60
        seconds = total_duration_s % 60
        duration_str = f"{minutes}:{seconds:02d}"

        # Encode the directory path to a URL format for file://
        encoded_folder_path = urllib.parse.quote(AUDIO_DEST_DIR)
        file_url = f"file://{encoded_folder_path}"

        # Front matter without the original audio link
        front_matter = "---\n"
        front_matter += f"creation date: {date_time_obj.strftime('%Y-%m-%d %I:%M %p')}\n"
        front_matter += f"duration: \"{duration_str}\"\n"
        front_matter += "location: \"\"\n"
        front_matter += "tags:\n"
        for t in tags:
            front_matter += f"  - \"{t}\"\n"
        front_matter += "---\n"

        # Add the original audio link back into the body
        audio_link = f"[📎 Original Audio]({file_url})"

        full_content = (
            f"{front_matter}"
            f"## Summary\n{summary}\n\n"
            f"{audio_link}\n\n"
            f"## Full Transcription\n> {transcription_text}"
        )

        create_markdown_file(file_path, date_time_obj, full_content, category_config, audio_filename)

        db[file_path] = {
            "transcribed": True,
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": truncated_summary,
            "tags": tags
        }
        save_database(db)

    except Exception as e:
        log_and_print(f"Error during transcription: {e}", logging.ERROR)

def retroactive_transcription(db):
    if not RETROACTIVE_ENABLED:
        log_and_print("Retroactive transcription is disabled. Skipping.")
        return
    with os.scandir(OBSERVATION_DIR) as it:
        for entry in it:
            if entry.is_file() and entry.name.endswith(AUDIO_EXT):
                full_path = os.path.join(OBSERVATION_DIR, entry.name)
                if not db.get(full_path, {}).get("transcribed"):
                    transcribe_audio_file(full_path, db)

class Handler(FileSystemEventHandler):
    def __init__(self, db):
        super().__init__()
        self.db = db

    def on_created(self, event):
        if event.is_directory or not event.src_path.endswith(AUDIO_EXT):
            return
        log_and_print(f"New {AUDIO_EXT} file detected: {event.src_path}")
        time.sleep(1)
        transcribe_audio_file(event.src_path, self.db)
        log_and_print("Returning to watch mode.")

class Watcher:
    def __init__(self, db):
        self.observer = Observer()
        self.db = db

    def run(self):
        event_handler = Handler(self.db)
        self.observer.schedule(event_handler, OBSERVATION_DIR, recursive=False)
        self.observer.start()
        log_and_print(f"Watching for new {AUDIO_EXT} files in {OBSERVATION_DIR}")
        try:
            while True:
                time.sleep(WATCH_LOOP_INTERVAL)
                if not self.observer.is_alive():
                    log_and_print("Observer stopped unexpectedly! Restarting...")
                    self.observer.stop()
                    self.observer = Observer()  # Create a new observer
                    self.observer.schedule(event_handler, OBSERVATION_DIR, recursive=False)
                    self.observer.start()
        except KeyboardInterrupt:
            self.observer.stop()
            log_and_print("Watcher stopped.")
        self.observer.join()

# Define categories and their configurations
CATEGORIES = {
    "voice memo": {
        "path": "02 Daily Notes",
        "tags": ["#journal", "#voicememo"],
        "context_info": """The speaker is Peter Spier. The summary should be written in first-person, as this will be saved in his personal knowledge graph or second brain, in other words, "I" or "me" is Peter.  Peter is a 41-year-old construction executive living with his wife Keri and their two children — 10-year-old son (Ben), and a 8-year-old daughter (Nora), — near Seattle's Green Lake neighborhood. He works for Hathaway Dinwiddie Construction Company, managing large commercial interiors projects. His professional life involves coordinating complex construction proposals, preconstruction, and integrating advanced technology, reflecting a role that demands attention to detail, strategic planning, and adapting to evolving industry standards.

        Beyond his work, Peter is family-focused. He's attentive to his children's interests while also encouraging outdoor adventures, snowboarding, camping trips, music, gaming, and travel. Cooking, hosting gatherings, and celebrating holidays also figure prominently in his family life.

        Peter values personal growth and wellbeing. He's open to improving his diet, exercise routine, and overall health, drawing on insights from podcasts, wellness checkups, and various lifestyle methodologies. Although comfortable with technology—leveraging AI tools, playing with crypto, collecting NFTs, experimenting with image generation software, and refining deployment workflows for web applications—he balances these interests with a desire for practical improvements in daily life. Ultimately, Peter's context is one of a dedicated family man, a seasoned construction professional, and a lifelong learner, blending professional ambition, familial devotion, and a thoughtful approach to health and personal development.""",
        "structure": ["year", "month"],
        "integrate_into_daily_note": True
    },
    "lecture": {
        "path": "lectures",
        "tags": ["#lecture"],
        "context_info": "",
        "structure": ["year"],
        "integrate_into_daily_note": False
    }
}

DEFAULT_CATEGORY = {
    "path": "07 Inbox",
    "tags": [],
    "context_info": "",
    "structure": [],
    "integrate_into_daily_note": False
}

if __name__ == "__main__":
    client.api_key = os.getenv("OPENAI_API_KEY")
    if not client.api_key:
        raise ValueError("Set your OPENAI_API_KEY environment variable before running this script.")

    db = load_database()
    retroactive_transcription(db)
    w = Watcher(db)
    w.run()
