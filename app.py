from flask import Flask, render_template, request, jsonify, send_from_directory, session
from pathlib import Path
import json, os, subprocess, time
from filelock import FileLock
import secrets

APP_ROOT = Path(__file__).parent.resolve()
DATA_JSON = APP_ROOT / "data" / "phrases_data.json"
AUDIO_DIR = APP_ROOT / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
LOCK_FILE = str(DATA_JSON) + ".lock"

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))
ADMIN_CODE = os.environ.get('ADMIN_CODE', 'potomitan2024')

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

@app.route("/api/login", methods=["POST"])
def api_login():
    code = request.json.get("code")
    if code == ADMIN_CODE:
        session["authenticated"] = True
        session["user"] = request.json.get("user", "admin")
        return jsonify({"success": True, "message": "Authentification réussie"})
    return jsonify({"success": False, "message": "Code incorrect"}), 401

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Déconnexion réussie"})

@app.route("/api/status")
def api_status():
    return jsonify({
        "authenticated": session.get("authenticated", False),
        "user": session.get("user")
    })

@app.route("/api/add-phrase", methods=["POST"])
def api_add_phrase():
    if not session.get("authenticated"):
        return jsonify({"error": "Non autorisé"}), 401
    
    phrase_data = request.json
    required_fields = ["fr", "gcf"]
    
    for field in required_fields:
        if not phrase_data.get(field):
            return jsonify({"error": f"Champ requis manquant: {field}"}), 400
    
    # Générer un nouvel ID
    try:
        with FileLock(LOCK_FILE, timeout=5):
            data = load_data()
            
            # Trouver le prochain ID numérique disponible
            existing_ids = []
            for item in data:
                item_id = item.get("id", "")
                if isinstance(item_id, str) and item_id.startswith("phr"):
                    try:
                        existing_ids.append(int(item_id[3:]))
                    except ValueError:
                        pass
            
            next_id = max(existing_ids, default=0) + 1
            new_id = f"phr{next_id}"
            
            # Créer la nouvelle phrase
            new_phrase = {
                "id": new_id,
                "fr": phrase_data["fr"].strip(),
                "gcf": phrase_data["gcf"].strip(),
                "audio": "paniaudio.mp3",  # Placeholder par défaut
                "urgency": phrase_data.get("urgency", "medium"),
                "category": phrase_data.get("category", "general"),
                "source": "user_added",
                "added_by": session.get("user", "unknown"),
                "added_at": int(time.time())
            }
            
            data.append(new_phrase)
            # Écrire directement sans double verrou
            with open(DATA_JSON, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({"error": f"Impossible d'ajouter la phrase (verrou): {str(e)}"}), 500
    
    return jsonify({
        "success": True,
        "message": "Phrase ajoutée avec succès",
        "phrase": new_phrase
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), debug=True)
