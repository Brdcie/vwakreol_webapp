from flask import Flask, render_template, request, jsonify, send_from_directory
from pathlib import Path
import json, os, subprocess, time
from filelock import FileLock

APP_ROOT = Path(__file__).parent.resolve()
DATA_JSON = APP_ROOT / "data" / "phrases_data.json"
AUDIO_DIR = APP_ROOT / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
LOCK_FILE = str(DATA_JSON) + ".lock"

app = Flask(__name__, static_folder="static", template_folder="templates")

# Configuration pour production
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response

def load_data():
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with FileLock(LOCK_FILE, timeout=10):
        with open(DATA_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/todo")
def api_todo():
    data = load_data()
    todo = [p for p in data if p.get("audio") == "paniaudio.mp3"]
    # Keep minimal fields to send to client
    lite = [{"id": p.get("id"), "fr": p.get("fr"), "gcf": p.get("gcf")} for p in todo]
    return jsonify({"count": len(lite), "items": lite})

@app.route("/api/upload", methods=["POST"])
def api_upload():
    phrase_id = request.form.get("id")
    if not phrase_id:
        return jsonify({"error": "Missing id"}), 400

    file = request.files.get("audio")
    if not file:
        return jsonify({"error": "Missing audio file"}), 400

    # Save temp upload
    tmp_in = AUDIO_DIR / f"{phrase_id}_{int(time.time())}.webm"
    file.save(tmp_in)

    # Convert to MP3 with ffmpeg
    out_mp3 = AUDIO_DIR / f"{phrase_id}.mp3"
    cmd = [
        "/usr/bin/ffmpeg", "-y",
        "-i", str(tmp_in),
        "-ac", "1",        # mono
        "-ar", "44100",    # 44.1 kHz
        "-b:a", "192k",    # bitrate
        str(out_mp3)
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "ffmpeg conversion failed", "details": e.stderr.decode("utf-8", errors="ignore")}), 500
    finally:
        try:
            tmp_in.unlink(missing_ok=True)
        except Exception:
            pass

    # Update JSON atomically
    with FileLock(LOCK_FILE, timeout=10):
        data = load_data()
        updated = False
        for p in data:
            if str(p.get("id")) == str(phrase_id):
                # store relative path from project root for consistency
                rel_path = f"audio/{phrase_id}.mp3"
                p["audio"] = rel_path
                p["updated_at"] = int(time.time())
                updated = True
                break
        if updated:
            with open(DATA_JSON, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            return jsonify({"error": "id not found"}), 404

    return jsonify({"ok": True, "mp3": f"/audio/{phrase_id}.mp3"})

@app.route("/audio/<path:filename>")
def serve_audio(filename):
    return send_from_directory(AUDIO_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), debug=True)
